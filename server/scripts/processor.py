import pandas as pd
import sys
import os
import json

import pandas as pd
import numpy as np
import sys
import os
import json
import re

def process_file(file_path, output_path):
    try:
        # 1. Load Data
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.csv':
            df = pd.read_csv(file_path)
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        else:
            return {"status": "failed", "error": f"Unsupported file type: {ext}"}

        # Helper to get JSON-safe sample
        def get_sample(dframe):
            try:
                # Convert to JSON and back to getting serializable dicts (handles dates etc)
                return json.loads(dframe.head(5).to_json(orient='records', date_format='iso'))
            except:
                return []

        # Audit: Initial State
        rows_before = len(df)
        initial_cols = list(df.columns)
        sample_before = get_sample(df)
        total_cells = df.size if not df.empty else 1
        null_cells_before = df.isnull().sum().sum()

        # 2. Advanced Cleaning & Standardization
        # Standardize Column Names (snake_case, trim)
        def clean_column_name(col):
            col = str(col).strip()
            col = re.sub(r'[^a-zA-Z0-9]', '_', col)
            return col.lower().strip('_')

        df.columns = [clean_column_name(col) for col in df.columns]

        # Fix Data Types (Currency, Dates)
        for col in df.columns:
            # Detect currency strings
            if df[col].dtype == 'object':
                # Try to detect if it's a numeric string with symbols
                sample_vals = df[col].dropna().head(10).astype(str)
                if sample_vals.str.contains(r'[₹\$,]').any():
                    clean_col = df[col].astype(str).str.replace(r'[₹\$,]', '', regex=True)
                    numeric_col = pd.to_numeric(clean_col, errors='coerce')
                    if numeric_col.notnull().sum() > len(df) * 0.3:
                        df[col] = numeric_col

            # Detect and fix dates
            if 'date' in col.lower() or 'time' in col.lower():
                df[col] = pd.to_datetime(df[col], errors='coerce')

        # 3. Missing Value Handling
        for col in df.columns:
            if df[col].isnull().any():
                if np.issubdtype(df[col].dtype, np.number):
                    df[col].fillna(df[col].median(), inplace=True)
                else:
                    df[col].fillna("Unknown", inplace=True)

        # 4. Outlier Detection (IQR Method)
        outlier_flags = {}
        for col in df.select_dtypes(include=[np.number]).columns:
            # Only check if there's enough variation
            if df[col].nunique() > 5:
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                outliers_count = ((df[col] < lower_bound) | (df[col] > upper_bound)).sum()
                if outliers_count > 0:
                    outlier_flags[col] = int(outliers_count)

        # 5. Feature Engineering
        # Date parts
        datetime_cols = df.select_dtypes(include=['datetime64']).columns
        for col in datetime_cols:
            df[f'{col}_year'] = df[col].dt.year
            df[f'{col}_month'] = df[col].dt.month_name()

        # Profit Margin if applicable
        if 'revenue' in df.columns and 'cost' in df.columns:
            df['profit'] = df['revenue'] - df['cost']
            df['profit_margin'] = (df['profit'] / df['revenue']).replace([np.inf, -np.inf], 0).fillna(0)

        # 6. Basic Operations (Duplicates/Empty)
        df.dropna(how='all', inplace=True)
        rows_after_dropna = len(df)
        df.drop_duplicates(inplace=True)
        rows_after_duplicates = len(df)

        # 7. Data Profiling (Alteryx-style)
        column_profile = {}
        for col in df.columns:
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
            
            # Numeric stats
            if np.issubdtype(df[col].dtype, np.number):
                profile["min"] = float(df[col].min()) if not df[col].empty else 0
                profile["max"] = float(df[col].max()) if not df[col].empty else 0
                profile["mean"] = float(df[col].mean()) if not df[col].empty else 0
            
            column_profile[col] = profile

        # 8. Data Quality Score calculation
        # Very simple heuristic: start at 100, deduct for issues
        deduction = (null_cells_before / total_cells * 50) + (len(outlier_flags) * 5)
        quality_score = max(5, min(100, int(98 - deduction)))

        # Final state
        final_cols = list(df.columns)
        sample_after = get_sample(df)

        # Save Processed File
        df.to_csv(output_path, index=False)

        return {
            "status": "completed",
            "audit": {
                "rows_before": rows_before,
                "rows_after": len(df),
                "empty_rows_removed": rows_before - rows_after_dropna,
                "duplicates_removed": rows_after_dropna - rows_after_duplicates,
                "columns_processed": len(final_cols),
                "renamed_columns": [c for c in df.columns if c not in [clean_column_name(x) for x in initial_cols]],
                "sample_before": sample_before,
                "sample_after": sample_after,
                "quality_score": quality_score,
                "outliers_found": outlier_flags,
                "features_added": [c for c in final_cols if c not in [clean_column_name(x) for x in initial_cols]],
                "column_profile": column_profile
            },
            "output_file": output_path
        }

    except Exception as e:
        return {"status": "failed", "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"status": "failed", "error": "Insufficient arguments"}))
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    result = process_file(input_file, output_file)
    print(json.dumps(result))
