# Family Tree Web Application

A modern web-based application for visualizing family trees from CSV data. Upload your family data and explore relationships through interactive visualizations.

## Features

- **CSV Upload**: Easy drag-and-drop or click-to-upload CSV files
- **Interactive Visualization**: Two layout options:
  - Tree Layout: Traditional hierarchical family tree
  - Force Layout: Interactive network graph with draggable nodes
- **Person Details**: Click on any person to view detailed information
- **Navigation Controls**: Zoom in/out, pan, reset view, and fit-to-view
- **Statistics Dashboard**: View family statistics (total members, marriages, living/deceased)
- **Color-Coded Nodes**: Visual distinction between genders
- **Furigana Support**: Japanese reading support for names
- **Template Generator**: Download a pre-filled example CSV to get started

## CSV File Format

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `id` | Unique identifier (hash/string) | person1, abc123 |
| `family_name` | Surname | Yamada |
| `first_name` | Given name | Taro |
| `family_name_furigana` | Reading of family name (Japanese) | ヤマダ |
| `first_name_furigana` | Reading of first name (Japanese) | タロウ |

### Optional Fields

| Field | Description | Example |
|-------|-------------|---------|
| `birth_date` | Date of birth (YYYY-MM-DD) | 1950-01-15 |
| `death_date` | Date of death (YYYY-MM-DD) | 2010-03-20 |
| `gender` | Gender (male/female) | male |
| `married_with` | ID of spouse | person2 |
| `birth_place` | Place of birth | Tokyo |
| `death_place` | Place of death | Osaka |
| `occupation` | Profession or job | Engineer |
| `notes` | Additional information | Founder of company |
| `father_id` | ID of father | person10 |
| `mother_id` | ID of mother | person11 |
| `child_id1` | ID of first child | person3 |
| `child_id2` | ID of second child | person4 |
| `child_id3...` | Additional children | person5 |

### CSV Example

```csv
id,family_name,first_name,family_name_furigana,first_name_furigana,birth_date,death_date,gender,married_with,birth_place,death_place,occupation,notes,father_id,mother_id,child_id1,child_id2
person1,Yamada,Taro,ヤマダ,タロウ,1950-01-15,,male,person2,Tokyo,,Engineer,Founder of business,,,person3,person4
person2,Sato,Hanako,サトウ,ハナコ,1952-03-20,,female,person1,Osaka,,Teacher,,,,,,
person3,Yamada,Ichiro,ヤマダ,イチロウ,1975-06-10,,male,person4,Tokyo,,Doctor,,person1,person2,person5,
```

## Quick Start

The fastest way to get started:

```bash
# On macOS/Linux
./run.sh

# On Windows
run.bat
```

This will automatically:
1. Check if uv is installed
2. Create a virtual environment
3. Install dependencies
4. Start the Flask server at http://localhost:5000

## Installation & Setup

### Prerequisites

- Python 3.8 or higher
- [uv](https://docs.astral.sh/uv/) - Fast Python package installer and resolver

### Installing uv

If you don't have `uv` installed:

```bash
# On macOS and Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# On Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

For more installation options, visit [uv documentation](https://docs.astral.sh/uv/getting-started/installation/).

### Installation Steps

1. **Clone or navigate to the project directory**:
   ```bash
   cd /home/mas/proj/study/family_tree
   ```

2. **Create and activate a virtual environment with uv**:
   ```bash
   # uv will automatically create a virtual environment and install dependencies
   uv sync
   ```

3. **Start the Flask server**:
   ```bash
   # Run with uv
   uv run python backend/app.py

   # Or activate the virtual environment first
   source .venv/bin/activate  # On macOS/Linux
   # .venv\Scripts\activate    # On Windows
   python backend/app.py
   ```

   The server will start on `http://localhost:5000`

4. **Open the application**:
   - Open your web browser
   - Navigate to `http://localhost:5000`
   - The application interface will load automatically

## Usage Guide

### 1. Upload Your CSV File

**Option A: Drag and Drop**
- Drag your CSV file onto the upload box
- The file will be processed automatically

**Option B: Click to Upload**
- Click on the upload box
- Select your CSV file from the file dialog
- Click "Open"

### 2. Download Template (Optional)

- Click the "Download CSV Template" button
- A pre-filled example CSV will be downloaded
- Use this as a reference for formatting your own data

### 3. View the Family Tree

Once uploaded, the family tree will be displayed with:
- **Nodes**: Circles representing each person
  - Blue circles: Males
  - Pink circles: Females
  - Purple circles: Unspecified gender
- **Lines**:
  - Solid blue lines: Parent-child relationships
  - Dashed red lines: Marriages

### 4. Interact with the Visualization

**Navigation Controls**:
- **+ button**: Zoom in
- **- button**: Zoom out
- **Reset button**: Return to original view
- **Fit button**: Fit entire tree in view
- **Layout dropdown**: Switch between Tree and Force layouts

**Mouse Interactions**:
- **Click on person**: View detailed information
- **Drag background**: Pan around the tree
- **Scroll wheel**: Zoom in/out
- **Drag nodes** (Force layout only): Reposition nodes

### 5. View Person Details

Click on any person's node or name to see:
- Full name with furigana
- Birth and death dates/places
- Gender
- Occupation
- Additional notes

## Project Structure

```
family_tree/
├── backend/
│   └── app.py              # Flask server and API
├── frontend/
│   ├── index.html         # Main HTML page
│   ├── styles.css         # Styling
│   └── app.js             # JavaScript logic and D3.js visualization
├── pyproject.toml         # Project dependencies (uv)
├── uv.lock               # Dependency lock file for reproducible builds
├── .python-version        # Python version specification
├── .gitignore            # Git ignore patterns
├── run.sh                # Quick start script (macOS/Linux)
├── run.bat               # Quick start script (Windows)
├── example_family.csv     # Sample data file with 3 generations
└── README.md             # This file
```

## Technology Stack

- **Backend**: Flask (Python)
- **Package Manager**: uv (fast Python package installer)
- **Frontend**: HTML5, CSS3, JavaScript
- **Visualization**: D3.js v7
- **API**: RESTful API with JSON

## API Endpoints

### POST /api/upload
Upload and process a CSV file

**Request**: multipart/form-data with file
**Response**:
```json
{
  "success": true,
  "data": {
    "people": {...},
    "relationships": [...]
  }
}
```

### POST /api/validate
Validate CSV structure and relationships

**Request**: JSON with CSV content
**Response**:
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "person_count": 10
}
```

## Tips for Creating Your Family Tree

1. **Start with root ancestors**: Begin with the oldest generation (people without parents)
2. **Use consistent IDs**: Use simple, memorable IDs like "person1", "person2", or initials+year
3. **Link relationships carefully**: Double-check father_id, mother_id, and married_with fields
4. **Include dates**: Use ISO format (YYYY-MM-DD) for dates when known
5. **Leave fields empty**: If you don't know a value, leave it empty (don't use "Unknown")
6. **Add notes**: Use the notes field for interesting family stories or important details

## Troubleshooting

**Problem**: uv is not installed
- **Solution**: Install uv using the installation commands in the "Installing uv" section above

**Problem**: Cannot connect to server
- **Solution**: Make sure the Flask server is running (`uv run python backend/app.py` or `./run.sh`)

**Problem**: CSV upload fails
- **Solution**: Check that your CSV has the required columns and proper formatting

**Problem**: Family tree looks messy
- **Solution**: Try switching between Tree and Force layouts, or use the "Fit" button

**Problem**: Some people don't appear
- **Solution**: Check that all referenced IDs (father_id, mother_id, etc.) exist in the CSV

**Problem**: Dependencies not installing
- **Solution**: Run `uv sync` to reinstall all dependencies

## Future Enhancements

Potential features for future versions:
- Export family tree as image (PNG/SVG)
- Edit family data directly in the browser
- Search functionality
- Timeline view
- Print-friendly layouts
- Multiple family tree support
- Photo upload for each person
- Family tree sharing

## License

This project is open source and available for personal and educational use.

## Support

For issues or questions, please check:
1. This README file
2. The example CSV file for proper formatting
3. Browser console for error messages