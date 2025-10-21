from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import csv
import io
import hashlib
from datetime import datetime
from typing import Dict, List, Optional
import os

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

class Person:
    def __init__(self, data: Dict):
        self.id = data.get('id', '')
        self.first_name = data.get('first_name', '')
        self.family_name = data.get('family_name', '')
        self.first_name_furigana = data.get('first_name_furigana', '')
        self.family_name_furigana = data.get('family_name_furigana', '')
        self.birth_date = data.get('birth_date', '')
        self.death_date = data.get('death_date', '')
        self.gender = data.get('gender', '')
        self.married_with = data.get('married_with', '')
        self.birth_place = data.get('birth_place', '')
        self.death_place = data.get('death_place', '')
        self.occupation = data.get('occupation', '')
        self.notes = data.get('notes', '')
        self.father_id = data.get('father_id', '')
        self.mother_id = data.get('mother_id', '')

        # Parse children IDs
        self.children_ids = []
        for i in range(1, 20):  # Support up to 20 children
            child_id = data.get(f'child_id{i}', '').strip()
            if child_id:
                self.children_ids.append(child_id)

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'family_name': self.family_name,
            'first_name_furigana': self.first_name_furigana,
            'family_name_furigana': self.family_name_furigana,
            'birth_date': self.birth_date,
            'death_date': self.death_date,
            'gender': self.gender,
            'married_with': self.married_with,
            'birth_place': self.birth_place,
            'death_place': self.death_place,
            'occupation': self.occupation,
            'notes': self.notes,
            'father_id': self.father_id,
            'mother_id': self.mother_id,
            'children_ids': self.children_ids
        }

class FamilyTree:
    def __init__(self):
        self.people: Dict[str, Person] = {}
        self.relationships = []

    def add_person(self, person: Person):
        self.people[person.id] = person

    def build_relationships(self):
        """Build relationship links between people"""
        self.relationships = []

        for person_id, person in self.people.items():
            # Parent-child relationships
            if person.father_id and person.father_id in self.people:
                self.relationships.append({
                    'type': 'parent-child',
                    'from': person.father_id,
                    'to': person_id
                })

            if person.mother_id and person.mother_id in self.people:
                self.relationships.append({
                    'type': 'parent-child',
                    'from': person.mother_id,
                    'to': person_id
                })

            # Marriage relationships
            if person.married_with and person.married_with in self.people:
                # Avoid duplicate marriage relationships
                if not any(r['type'] == 'marriage' and
                          set([r['from'], r['to']]) == set([person_id, person.married_with])
                          for r in self.relationships):
                    self.relationships.append({
                        'type': 'marriage',
                        'from': person_id,
                        'to': person.married_with
                    })

    def to_dict(self):
        return {
            'people': {pid: p.to_dict() for pid, p in self.people.items()},
            'relationships': self.relationships
        }

def parse_csv(file_content: str) -> FamilyTree:
    """Parse CSV content and build family tree"""
    tree = FamilyTree()

    csv_file = io.StringIO(file_content)
    reader = csv.DictReader(csv_file)

    for row in reader:
        # Skip empty rows
        if not row.get('id', '').strip():
            continue

        person = Person(row)
        tree.add_person(person)

    tree.build_relationships()
    return tree

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/upload', methods=['POST'])
def upload_csv():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'File must be a CSV'}), 400

        # Read and parse CSV
        content = file.read().decode('utf-8')
        tree = parse_csv(content)

        return jsonify({
            'success': True,
            'data': tree.to_dict()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/validate', methods=['POST'])
def validate_csv():
    """Validate CSV structure and relationships"""
    try:
        data = request.json
        content = data.get('content', '')

        tree = parse_csv(content)
        errors = []
        warnings = []

        # Validate relationships
        for person_id, person in tree.people.items():
            # Check if referenced IDs exist
            if person.father_id and person.father_id not in tree.people:
                errors.append(f"Person {person_id} references non-existent father {person.father_id}")

            if person.mother_id and person.mother_id not in tree.people:
                errors.append(f"Person {person_id} references non-existent mother {person.mother_id}")

            if person.married_with and person.married_with not in tree.people:
                warnings.append(f"Person {person_id} references non-existent spouse {person.married_with}")

            for child_id in person.children_ids:
                if child_id not in tree.people:
                    warnings.append(f"Person {person_id} references non-existent child {child_id}")

        return jsonify({
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'person_count': len(tree.people)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sample', methods=['GET'])
def get_sample_data():
    """Return sample family tree data for demonstration"""
    try:
        # Load the example CSV file
        sample_file_path = os.path.join(os.path.dirname(__file__), '..', 'example_family.csv')

        if not os.path.exists(sample_file_path):
            return jsonify({'error': 'Sample file not found'}), 404

        with open(sample_file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        tree = parse_csv(content)

        return jsonify({
            'success': True,
            'data': tree.to_dict()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
