"""
Backend tests for Student CRUD and Attendance APIs
Tests: POST/GET/PUT/DELETE /api/students, POST/GET /api/attendance
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = os.environ.get('TEST_ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'admin123')
LEADER_USERNAME = os.environ.get('TEST_LEADER_USERNAME', 'lider1')
LEADER_PASSWORD = os.environ.get('TEST_LEADER_PASSWORD', 'lider123')


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="module")
def leader_token(api_client):
    """Get leader authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": LEADER_USERNAME,
        "password": LEADER_PASSWORD
    })
    assert response.status_code == 200, f"Leader login failed: {response.text}"
    data = response.json()
    assert "token" in data
    return data["token"], data.get("class_id")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    }


@pytest.fixture(scope="module")
def leader_headers(leader_token):
    """Headers with leader auth"""
    token, _ = leader_token
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }


@pytest.fixture(scope="module")
def test_class_id(api_client, admin_headers):
    """Get first available class ID for testing"""
    response = api_client.get(f"{BASE_URL}/api/classes", headers=admin_headers)
    assert response.status_code == 200
    classes = response.json()
    assert len(classes) > 0, "No classes found in database"
    return classes[0]["id"]


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self, api_client):
        """Test admin login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "admin"
        assert data["username"] == ADMIN_USERNAME
    
    def test_leader_login_success(self, api_client):
        """Test leader login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": LEADER_USERNAME,
            "password": LEADER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "leader"
        assert "class_id" in data
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401


class TestClasses:
    """Classes endpoint tests"""
    
    def test_get_classes(self, api_client, admin_headers):
        """Test getting all classes"""
        response = api_client.get(f"{BASE_URL}/api/classes", headers=admin_headers)
        assert response.status_code == 200
        classes = response.json()
        assert isinstance(classes, list)
        assert len(classes) > 0
        # Verify class structure
        for cls in classes:
            assert "id" in cls
            assert "name" in cls


class TestStudentCRUD:
    """Student CRUD endpoint tests"""
    
    def test_create_student_admin_only(self, api_client, admin_headers, test_class_id):
        """Test creating a student (admin only)"""
        unique_name = f"TEST_Student_{uuid.uuid4().hex[:8]}"
        response = api_client.post(f"{BASE_URL}/api/students", json={
            "name": unique_name,
            "class_id": test_class_id
        }, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Student created successfully"
        
        # Store for cleanup
        TestStudentCRUD.created_student_id = data["id"]
        TestStudentCRUD.created_student_name = unique_name
    
    def test_create_student_leader_forbidden(self, api_client, leader_headers, test_class_id):
        """Test that leaders cannot create students"""
        response = api_client.post(f"{BASE_URL}/api/students", json={
            "name": "TEST_LeaderStudent",
            "class_id": test_class_id
        }, headers=leader_headers)
        
        assert response.status_code == 403
    
    def test_get_students_by_class(self, api_client, admin_headers, test_class_id):
        """Test getting students filtered by class"""
        response = api_client.get(
            f"{BASE_URL}/api/students?class_id={test_class_id}",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        students = response.json()
        assert isinstance(students, list)
        
        # Verify all returned students belong to the requested class
        for student in students:
            assert student["class_id"] == test_class_id
            assert "id" in student
            assert "name" in student
    
    def test_get_all_students(self, api_client, admin_headers):
        """Test getting all students without filter"""
        response = api_client.get(f"{BASE_URL}/api/students", headers=admin_headers)
        
        assert response.status_code == 200
        students = response.json()
        assert isinstance(students, list)
    
    def test_update_student(self, api_client, admin_headers):
        """Test updating a student"""
        if not hasattr(TestStudentCRUD, 'created_student_id'):
            pytest.skip("No student created to update")
        
        new_name = f"TEST_Updated_{uuid.uuid4().hex[:8]}"
        response = api_client.put(
            f"{BASE_URL}/api/students/{TestStudentCRUD.created_student_id}",
            json={"name": new_name},
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Student updated successfully"
        
        # Verify update persisted
        get_response = api_client.get(f"{BASE_URL}/api/students", headers=admin_headers)
        students = get_response.json()
        updated_student = next((s for s in students if s["id"] == TestStudentCRUD.created_student_id), None)
        assert updated_student is not None
        assert updated_student["name"] == new_name
    
    def test_update_student_leader_forbidden(self, api_client, leader_headers):
        """Test that leaders cannot update students"""
        if not hasattr(TestStudentCRUD, 'created_student_id'):
            pytest.skip("No student created to update")
        
        response = api_client.put(
            f"{BASE_URL}/api/students/{TestStudentCRUD.created_student_id}",
            json={"name": "TEST_LeaderUpdate"},
            headers=leader_headers
        )
        
        assert response.status_code == 403
    
    def test_delete_student(self, api_client, admin_headers):
        """Test deleting a student"""
        if not hasattr(TestStudentCRUD, 'created_student_id'):
            pytest.skip("No student created to delete")
        
        response = api_client.delete(
            f"{BASE_URL}/api/students/{TestStudentCRUD.created_student_id}",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Student deleted successfully"
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/students", headers=admin_headers)
        students = get_response.json()
        deleted_student = next((s for s in students if s["id"] == TestStudentCRUD.created_student_id), None)
        assert deleted_student is None
    
    def test_delete_nonexistent_student(self, api_client, admin_headers):
        """Test deleting a non-existent student"""
        fake_id = str(uuid.uuid4())
        response = api_client.delete(
            f"{BASE_URL}/api/students/{fake_id}",
            headers=admin_headers
        )
        
        assert response.status_code == 404
    
    def test_create_student_invalid_class(self, api_client, admin_headers):
        """Test creating student with invalid class ID"""
        response = api_client.post(f"{BASE_URL}/api/students", json={
            "name": "TEST_InvalidClass",
            "class_id": str(uuid.uuid4())
        }, headers=admin_headers)
        
        assert response.status_code == 400


class TestAttendance:
    """Attendance endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup_test_students(self, api_client, admin_headers, leader_token):
        """Create test students for attendance testing"""
        _, class_id = leader_token
        if not class_id:
            pytest.skip("Leader has no assigned class")
        
        self.class_id = class_id
        self.student_ids = []
        
        # Create 3 test students
        for i in range(3):
            response = api_client.post(f"{BASE_URL}/api/students", json={
                "name": f"TEST_AttendanceStudent_{i}_{uuid.uuid4().hex[:6]}",
                "class_id": class_id
            }, headers=admin_headers)
            
            if response.status_code == 200:
                self.student_ids.append(response.json()["id"])
        
        yield
        
        # Cleanup: delete test students
        for student_id in self.student_ids:
            api_client.delete(f"{BASE_URL}/api/students/{student_id}", headers=admin_headers)
    
    def test_submit_attendance(self, api_client, leader_headers):
        """Test submitting attendance with present students"""
        if not self.student_ids:
            pytest.skip("No test students created")
        
        # Mark first 2 students as present
        present_ids = self.student_ids[:2]
        
        response = api_client.post(f"{BASE_URL}/api/attendance", json={
            "class_id": self.class_id,
            "present_student_ids": present_ids
        }, headers=leader_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Attendance submitted successfully"
        assert data["count"] == len(present_ids)
    
    def test_get_today_attendance(self, api_client, leader_headers):
        """Test getting today's attendance"""
        response = api_client.get(
            f"{BASE_URL}/api/attendance/today?class_id={self.class_id}",
            headers=leader_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "present_student_ids" in data
        assert "count" in data
        assert isinstance(data["present_student_ids"], list)
    
    def test_update_attendance(self, api_client, leader_headers):
        """Test updating attendance (all students present)"""
        if not self.student_ids:
            pytest.skip("No test students created")
        
        # Mark all students as present
        response = api_client.post(f"{BASE_URL}/api/attendance", json={
            "class_id": self.class_id,
            "present_student_ids": self.student_ids
        }, headers=leader_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == len(self.student_ids)
        
        # Verify update persisted
        get_response = api_client.get(
            f"{BASE_URL}/api/attendance/today?class_id={self.class_id}",
            headers=leader_headers
        )
        attendance = get_response.json()
        assert attendance["count"] == len(self.student_ids)
    
    def test_attendance_wrong_class_forbidden(self, api_client, leader_headers, test_class_id):
        """Test that leader cannot submit attendance for another class"""
        # Use a different class than the leader's assigned class
        if test_class_id == self.class_id:
            pytest.skip("Test class is same as leader's class")
        
        response = api_client.post(f"{BASE_URL}/api/attendance", json={
            "class_id": test_class_id,
            "present_student_ids": []
        }, headers=leader_headers)
        
        assert response.status_code == 403


class TestBulkStudentCreation:
    """Bulk student creation tests"""
    
    def test_bulk_create_students(self, api_client, admin_headers, test_class_id):
        """Test bulk student creation"""
        students = [
            {"name": f"TEST_Bulk_{i}_{uuid.uuid4().hex[:6]}", "class_id": test_class_id}
            for i in range(3)
        ]
        
        response = api_client.post(f"{BASE_URL}/api/students/bulk", json=students, headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "3 students created successfully" in data["message"]
        
        # Cleanup
        get_response = api_client.get(f"{BASE_URL}/api/students?class_id={test_class_id}", headers=admin_headers)
        for student in get_response.json():
            if student["name"].startswith("TEST_Bulk_"):
                api_client.delete(f"{BASE_URL}/api/students/{student['id']}", headers=admin_headers)


class TestDashboardIntegration:
    """Test that attendance updates reflect in admin dashboard"""
    
    def test_attendance_updates_daily_counts(self, api_client, admin_headers, leader_headers, leader_token):
        """Test that attendance submission updates daily counts for dashboard"""
        _, class_id = leader_token
        if not class_id:
            pytest.skip("Leader has no assigned class")
        
        # Create a test student
        student_response = api_client.post(f"{BASE_URL}/api/students", json={
            "name": f"TEST_Dashboard_{uuid.uuid4().hex[:6]}",
            "class_id": class_id
        }, headers=admin_headers)
        
        if student_response.status_code != 200:
            pytest.skip("Could not create test student")
        
        student_id = student_response.json()["id"]
        
        try:
            # Submit attendance
            api_client.post(f"{BASE_URL}/api/attendance", json={
                "class_id": class_id,
                "present_student_ids": [student_id]
            }, headers=leader_headers)
            
            # Check dashboard summary
            dashboard_response = api_client.get(f"{BASE_URL}/api/dashboard/summary", headers=admin_headers)
            assert dashboard_response.status_code == 200
            
            summary = dashboard_response.json()
            assert "total_meals" in summary
            assert "class_details" in summary
            
            # Verify the class appears in details
            class_detail = next((c for c in summary["class_details"] if c["class_id"] == class_id), None)
            if class_detail:
                assert class_detail["count"] >= 1
        finally:
            # Cleanup
            api_client.delete(f"{BASE_URL}/api/students/{student_id}", headers=admin_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
