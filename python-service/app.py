from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import json
import re
import uuid
import sys
from datetime import datetime

# Reconfigure stdout/stderr for Windows console compatibility
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

UPLOAD_DIR = "/tmp/uploads" if os.name != 'nt' else os.path.join(os.getcwd(), 'tmp_uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

def clean_column_name(col):
    col = str(col).strip()
    col = re.sub(r'[^a-zA-Z0-9]', '_', col)
    col = col.lower().strip('_')
    return col if col else 'column'

def safe_float(val, default=0.0):
    try:
        if pd.isna(val) or np.isinf(val):
            return default
        return float(val)
    except Exception:
        return default

def get_sample(df):
    try:
        # Convert to JSON and back to getting serializable dicts (handles dates/types cleanly)
        json_str = df.head(2000).to_json(orient='records', date_format='iso')
        data = json.loads(json_str)
        # Clean any remaining NaN/Inf values
        clean_data = []
        for row in data:
            clean_row = {}
            for k, v in row.items():
                if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                    clean_row[k] = None
                else:
                    clean_row[k] = v
            clean_data.append(clean_row)
        return clean_data
    except Exception as e:
        print(f"Sample generation warning: {e}")
        return []

@app.route("/process", methods=["POST"])
def process_file():
    if "file" not in request.files:
        return jsonify({"status": "failed", "error": "No file provided"}), 400

    file = request.files["file"]
    original_filename = file.filename or "unknown_file.csv"
    file_ext = os.path.splitext(original_filename)[1].lower()
    if not file_ext:
        file_ext = '.csv' # Default fallback
    
    input_path = ""
    try:
        # Save file temporarily
        temp_filename = f"{uuid.uuid4()}{file_ext}"
        input_path = os.path.join(UPLOAD_DIR, temp_filename)
        file.save(input_path)
        print(f"📥 Received file: {original_filename} -> Saved to {input_path}")
        sys.stdout.flush()

        # 1. Load Data with robust fallbacks
        df = None
        if file_ext == '.csv':
            try:
                df = pd.read_csv(input_path)
            except Exception:
                df = pd.read_csv(input_path, encoding='latin1', encoding_errors='replace')
        elif file_ext in ['.xlsx', '.xls']:
            try:
                df = pd.read_excel(input_path)
            except Exception:
                try:
                    engine = 'openpyxl' if file_ext == '.xlsx' else 'xlrd'
                    df = pd.read_excel(input_path, engine=engine)
                except Exception:
                    # Fallback: file might actually be CSV despite .xlsx extension
                    try:
                        df = pd.read_csv(input_path, encoding_errors='replace')
                    except Exception as parse_err:
                        return jsonify({"status": "failed", "error": f"Failed to parse Excel file: {str(parse_err)}"}), 400

        if df is None or df.empty:
            return jsonify({"status": "failed", "error": "The uploaded dataset is empty or unreadable."}), 400

        # Audit: Initial State
        rows_before = len(df)
        initial_cols = list(df.columns)
        sample_before = get_sample(df)
        total_cells = df.size if not df.empty else 1
        null_cells_before = int(df.isnull().sum().sum())

        # 2. Advanced Cleaning & Standardization
        clean_cols = [clean_column_name(col) for col in df.columns]
        
        # Handle duplicate column names after cleaning
        final_cols_list = []
        seen = {}
        for col in clean_cols:
            if col in seen:
                seen[col] += 1
                final_cols_list.append(f"{col}_{seen[col]}")
            else:
                seen[col] = 0
                final_cols_list.append(col)
        
        df.columns = final_cols_list

        # Fix Data Types (Currency, Dates)
        for col in df.columns:
            try:
                # Detect currency strings
                if df[col].dtype == 'object':
                    sample_vals = df[col].dropna().head(10).astype(str)
                    if sample_vals.str.contains(r'[₹\$,]').any():
                        clean_col = df[col].astype(str).str.replace(r'[₹\$,]', '', regex=True)
                        numeric_col = pd.to_numeric(clean_col, errors='coerce')
                        if numeric_col.notnull().sum() > len(df) * 0.3:
                            df[col] = numeric_col

                # Detect and fix dates
                if 'date' in col.lower() or 'time' in col.lower():
                    df[col] = pd.to_datetime(df[col], errors='coerce')
            except Exception as col_err:
                print(f"Column type conversion warning for {col}: {col_err}")

        # 3. Missing Value Handling (Pandas 2.0+ compatible without inplace chaining errors)
        for col in df.columns:
            try:
                if df[col].isnull().any():
                    if pd.api.types.is_numeric_dtype(df[col]):
                        med = df[col].median()
                        df[col] = df[col].fillna(med if pd.notnull(med) else 0)
                    else:
                        df[col] = df[col].fillna("Unknown")
            except Exception as fill_err:
                print(f"Fillna warning for {col}: {fill_err}")

        # 4. Outlier Detection (IQR Method)
        outlier_flags = {}
        for col in df.select_dtypes(include=[np.number]).columns:
            try:
                if df[col].nunique() > 5:
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    outliers_count = int(((df[col] < lower_bound) | (df[col] > upper_bound)).sum())
                    if outliers_count > 0:
                        outlier_flags[col] = outliers_count
            except Exception as out_err:
                print(f"Outlier detection warning for {col}: {out_err}")

        # 5. Feature Engineering
        try:
            datetime_cols = df.select_dtypes(include=['datetime64']).columns
            for col in datetime_cols:
                df[f'{col}_year'] = df[col].dt.year
                df[f'{col}_month'] = df[col].dt.month_name()

            if 'revenue' in df.columns and 'cost' in df.columns:
                df['profit'] = df['revenue'] - df['cost']
                df['profit_margin'] = (df['profit'] / df['revenue']).replace([np.inf, -np.inf], 0).fillna(0)
        except Exception as feat_err:
            print(f"Feature engineering warning: {feat_err}")

        # 6. Basic Operations
        df = df.dropna(how='all')
        rows_after_dropna = len(df)
        df = df.drop_duplicates()
        rows_after_duplicates = len(df)

        # 7. Data Profiling & Advanced Stats
        column_profile = {}
        numeric_df = df.select_dtypes(include=[np.number])
        
        for col in df.columns:
            try:
                nulls = int(df[col].isnull().sum())
                unique = int(df[col].nunique())
                col_type = str(df[col].dtype)
                
                profile = {
                    "type": col_type,
                    "null_count": nulls,
                    "null_pct": round((nulls / len(df)) * 100, 1) if len(df) > 0 else 0,
                    "unique_count": unique,
                    "health": "healthy" if nulls == 0 else "warning" if nulls < len(df) * 0.2 else "critical"
                }
                
                if pd.api.types.is_numeric_dtype(df[col]):
                    profile["min"] = safe_float(df[col].min())
                    profile["max"] = safe_float(df[col].max())
                    profile["mean"] = safe_float(df[col].mean())
                    profile["sum"] = safe_float(df[col].sum())
                    profile["std"] = safe_float(df[col].std())
                    profile["skewness"] = safe_float(df[col].skew())
                    profile["kurtosis"] = safe_float(df[col].kurtosis())
                
                column_profile[col] = profile
            except Exception as prof_err:
                print(f"Column profiling warning for {col}: {prof_err}")
                column_profile[col] = {
                    "type": str(df[col].dtype),
                    "null_count": 0,
                    "null_pct": 0,
                    "unique_count": 0,
                    "health": "healthy"
                }

        # 8. Correlation Matrix (Mathematical insight)
        correlation_matrix = {}
        if not numeric_df.empty and len(numeric_df.columns) > 1:
            try:
                corr = numeric_df.corr().replace([np.inf, -np.inf, np.nan], 0)
                correlation_matrix = json.loads(corr.to_json())
            except Exception as corr_err:
                print(f"Correlation matrix warning: {corr_err}")
                correlation_matrix = {}

        # 9. Dynamic Insight Generator
        mathematical_insights = []
        
        # Trend Insight
        if 'datetime_cols' in locals() and not datetime_cols.empty and not numeric_df.empty:
            for n_col in numeric_df.columns:
                try:
                    df_sorted = df.sort_values(datetime_cols[0])
                    first_val = df_sorted[n_col].iloc[0]
                    last_val = df_sorted[n_col].iloc[-1]
                    growth = ((last_val - first_val) / first_val * 100) if first_val != 0 else 0
                    direction = "increased" if growth > 0 else "decreased"
                    mathematical_insights.append(f"Trend: {n_col} has {direction} by {abs(growth):.1f}% over the period.")
                except Exception:
                    pass

        # Pareto/Concentration Insight
        try:
            cat_cols = df.select_dtypes(include=['object']).columns
            if not cat_cols.empty and not numeric_df.empty:
                p_cat = cat_cols[0]
                p_num = numeric_df.columns[0]
                grouped = df.groupby(p_cat)[p_num].sum().sort_values(ascending=False)
                if not grouped.empty and grouped.sum() != 0:
                    top_name = grouped.index[0]
                    top_pct = (grouped.iloc[0] / grouped.sum()) * 100
                    mathematical_insights.append(f"Pareto Analysis: Top {p_cat} '{top_name}' contributes {top_pct:.1f}% to total {p_num}.")
        except Exception as pareto_err:
            print(f"Pareto insight warning: {pareto_err}")

        # 10. Data Quality Score
        deduction = (null_cells_before / total_cells * 50) + (len(outlier_flags) * 5)
        quality_score = max(5, min(100, int(98 - deduction)))

        # Final state
        final_cols = list(df.columns)
        sample_after = get_sample(df)

        # Prepare result
        result = {
            "status": "completed",
            "csv_data": df.to_csv(index=False),
            "audit": {
                "rows_before": rows_before,
                "rows_after": len(df),
                "empty_rows_removed": max(0, rows_before - rows_after_dropna),
                "duplicates_removed": max(0, rows_after_dropna - rows_after_duplicates),
                "columns_processed": len(final_cols),
                "renamed_columns": [c for c in df.columns if c not in [clean_column_name(x) for x in initial_cols]],
                "sample_before": sample_before,
                "sample_after": sample_after,
                "quality_score": quality_score,
                "outliers_found": outlier_flags,
                "features_added": [c for c in final_cols if c not in [clean_column_name(x) for x in initial_cols]],
                "column_profile": column_profile,
                "correlation_matrix": correlation_matrix,
                "mathematical_insights": mathematical_insights,
                "engine": "Python Stats Engine"
            }
        }

        return jsonify(result)

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"PROCESSING ERROR: {str(e)}")
        print(error_traceback)
        sys.stdout.flush()
        return jsonify({"status": "failed", "error": str(e), "traceback": error_traceback}), 500
    finally:
        if input_path and os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass

@app.route("/", methods=["GET"])
def health_check():
    return "Python Data Processor Microservice is running!"

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
