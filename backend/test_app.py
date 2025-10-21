import unittest
import json
import io
from app import app, Person, FamilyTree, parse_csv


class TestPerson(unittest.TestCase):
    """Test Person class"""

    def test_person_initialization(self):
        """Test creating a person with basic data"""
        data = {
            'id': 'p1',
            'first_name': 'Taro',
            'family_name': 'Yamada',
            'gender': 'male',
            'birth_date': '1950-01-15'
        }
        person = Person(data)

        self.assertEqual(person.id, 'p1')
        self.assertEqual(person.first_name, 'Taro')
        self.assertEqual(person.family_name, 'Yamada')
        self.assertEqual(person.gender, 'male')
        self.assertEqual(person.birth_date, '1950-01-15')

    def test_person_with_children(self):
        """Test person with multiple children"""
        data = {
            'id': 'p1',
            'first_name': 'Taro',
            'family_name': 'Yamada',
            'child_id1': 'c1',
            'child_id2': 'c2',
            'child_id3': 'c3'
        }
        person = Person(data)

        self.assertEqual(len(person.children_ids), 3)
        self.assertIn('c1', person.children_ids)
        self.assertIn('c2', person.children_ids)
        self.assertIn('c3', person.children_ids)

    def test_person_to_dict(self):
        """Test converting person to dictionary"""
        data = {
            'id': 'p1',
            'first_name': 'Taro',
            'family_name': 'Yamada',
            'gender': 'male'
        }
        person = Person(data)
        person_dict = person.to_dict()

        self.assertEqual(person_dict['id'], 'p1')
        self.assertEqual(person_dict['first_name'], 'Taro')
        self.assertEqual(person_dict['family_name'], 'Yamada')
        self.assertEqual(person_dict['gender'], 'male')


class TestFamilyTree(unittest.TestCase):
    """Test FamilyTree class"""

    def test_add_person(self):
        """Test adding a person to family tree"""
        tree = FamilyTree()
        person = Person({'id': 'p1', 'first_name': 'Taro'})
        tree.add_person(person)

        self.assertEqual(len(tree.people), 1)
        self.assertIn('p1', tree.people)

    def test_build_parent_child_relationships(self):
        """Test building parent-child relationships"""
        tree = FamilyTree()

        # Add parent
        parent = Person({'id': 'p1', 'first_name': 'Taro'})
        tree.add_person(parent)

        # Add child
        child = Person({'id': 'c1', 'first_name': 'Ichiro', 'father_id': 'p1'})
        tree.add_person(child)

        tree.build_relationships()

        # Check relationship was created
        parent_child_rels = [r for r in tree.relationships if r['type'] == 'parent-child']
        self.assertEqual(len(parent_child_rels), 1)
        self.assertEqual(parent_child_rels[0]['from'], 'p1')
        self.assertEqual(parent_child_rels[0]['to'], 'c1')

    def test_build_marriage_relationships(self):
        """Test building marriage relationships"""
        tree = FamilyTree()

        # Add couple
        husband = Person({'id': 'p1', 'first_name': 'Taro', 'married_with': 'p2'})
        wife = Person({'id': 'p2', 'first_name': 'Hanako', 'married_with': 'p1'})
        tree.add_person(husband)
        tree.add_person(wife)

        tree.build_relationships()

        # Check marriage relationship was created (should only be one, not duplicate)
        marriage_rels = [r for r in tree.relationships if r['type'] == 'marriage']
        self.assertEqual(len(marriage_rels), 1)

    def test_to_dict(self):
        """Test converting family tree to dictionary"""
        tree = FamilyTree()
        person = Person({'id': 'p1', 'first_name': 'Taro'})
        tree.add_person(person)
        tree.build_relationships()

        tree_dict = tree.to_dict()

        self.assertIn('people', tree_dict)
        self.assertIn('relationships', tree_dict)
        self.assertEqual(len(tree_dict['people']), 1)


class TestCSVParsing(unittest.TestCase):
    """Test CSV parsing functionality"""

    def test_parse_simple_csv(self):
        """Test parsing a simple CSV"""
        csv_content = """id,family_name,first_name,gender,birth_date
p1,Yamada,Taro,male,1950-01-15
p2,Sato,Hanako,female,1952-03-20"""

        tree = parse_csv(csv_content)

        self.assertEqual(len(tree.people), 2)
        self.assertIn('p1', tree.people)
        self.assertIn('p2', tree.people)
        self.assertEqual(tree.people['p1'].first_name, 'Taro')
        self.assertEqual(tree.people['p2'].first_name, 'Hanako')

    def test_parse_csv_with_relationships(self):
        """Test parsing CSV with family relationships"""
        csv_content = """id,family_name,first_name,father_id,mother_id,married_with
p1,Yamada,Taro,,,p2
p2,Sato,Hanako,,,p1
c1,Yamada,Ichiro,p1,p2,"""

        tree = parse_csv(csv_content)

        self.assertEqual(len(tree.people), 3)

        # Check relationships were built
        parent_child_rels = [r for r in tree.relationships if r['type'] == 'parent-child']
        marriage_rels = [r for r in tree.relationships if r['type'] == 'marriage']

        self.assertEqual(len(parent_child_rels), 2)  # Father and mother
        self.assertEqual(len(marriage_rels), 1)

    def test_parse_csv_skip_empty_rows(self):
        """Test that empty rows are skipped"""
        csv_content = """id,family_name,first_name
p1,Yamada,Taro
,,
p2,Sato,Hanako"""

        tree = parse_csv(csv_content)

        self.assertEqual(len(tree.people), 2)


class TestAPI(unittest.TestCase):
    """Test Flask API endpoints"""

    def setUp(self):
        """Set up test client"""
        self.app = app.test_client()
        self.app.testing = True

    def test_index_route(self):
        """Test that index route returns HTML"""
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)

    def test_upload_no_file(self):
        """Test upload endpoint with no file"""
        response = self.app.post('/api/upload')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)

    def test_upload_valid_csv(self):
        """Test upload endpoint with valid CSV"""
        csv_content = """id,family_name,first_name,gender
p1,Yamada,Taro,male
p2,Sato,Hanako,female"""

        data = {
            'file': (io.BytesIO(csv_content.encode('utf-8')), 'test.csv')
        }

        response = self.app.post(
            '/api/upload',
            data=data,
            content_type='multipart/form-data'
        )

        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertIn('data', result)
        self.assertEqual(len(result['data']['people']), 2)

    def test_upload_non_csv_file(self):
        """Test upload endpoint with non-CSV file"""
        data = {
            'file': (io.BytesIO(b'test content'), 'test.txt')
        }

        response = self.app.post(
            '/api/upload',
            data=data,
            content_type='multipart/form-data'
        )

        self.assertEqual(response.status_code, 400)
        result = json.loads(response.data)
        self.assertIn('error', result)

    def test_validate_endpoint(self):
        """Test validate endpoint"""
        csv_content = """id,family_name,first_name,father_id
p1,Yamada,Taro,
c1,Yamada,Ichiro,p1"""

        response = self.app.post(
            '/api/validate',
            data=json.dumps({'content': csv_content}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['valid'])
        self.assertEqual(result['person_count'], 2)

    def test_validate_invalid_references(self):
        """Test validate endpoint with invalid references"""
        csv_content = """id,family_name,first_name,father_id
c1,Yamada,Ichiro,nonexistent"""

        response = self.app.post(
            '/api/validate',
            data=json.dumps({'content': csv_content}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertFalse(result['valid'])
        self.assertGreater(len(result['errors']), 0)

    def test_sample_endpoint(self):
        """Test sample data endpoint"""
        response = self.app.get('/api/sample')

        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertIn('data', result)
        self.assertIn('people', result['data'])
        self.assertIn('relationships', result['data'])
        # Verify sample data has people
        self.assertGreater(len(result['data']['people']), 0)


if __name__ == '__main__':
    unittest.main()
