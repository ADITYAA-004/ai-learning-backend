# API Request Examples

This file contains Postman and cURL examples for the Auth and Course APIs.

Base URL (local): `http://localhost:5000`

---

## Auth Endpoints

### Register

cURL:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"Password123","role":"instructor"}'
```

Postman:
- Method: POST
- URL: `http://localhost:5000/api/auth/register`
- Body → raw → JSON:

  {
    "name": "Alice",
    "email": "alice@example.com",
    "password": "Password123",
    "role": "instructor"
  }

---

### Login

cURL:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Password123"}'
```

Postman:
- Method: POST
- URL: `http://localhost:5000/api/auth/login`
- Body → raw → JSON:

  {
    "email": "alice@example.com",
    "password": "Password123"
  }

Response contains a JWT token. Save it as `TOKEN` for protected requests.

---

### Get Current User (`/api/auth/me`)

cURL:

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Postman:
- Method: GET
- URL: `http://localhost:5000/api/auth/me`
- Headers:
  - `Authorization: Bearer <TOKEN>`

---

## Course Endpoints

Note: All course endpoints require authentication. Creating/updating/deleting require `instructor` role. Use the JWT from login in the `Authorization` header.

Headers for protected requests:

- `Authorization: Bearer <TOKEN>`
- `Content-Type: application/json` (when sending JSON body)

### Create Course (POST /api/courses)

cURL:

```bash
curl -X POST http://localhost:5000/api/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Intro to AI","description":"Basics of AI","pdfUrl":"","videoUrl":"","thumbnail":""}'
```

Postman:
- Method: POST
- URL: `http://localhost:5000/api/courses`
- Headers: `Authorization: Bearer <TOKEN>`
- Body → raw JSON:

  {
    "title": "Intro to AI",
    "description": "Basics of AI",
    "pdfUrl": "",
    "videoUrl": "",
    "thumbnail": ""
  }

### Get All Courses (GET /api/courses)

cURL:

```bash
curl -X GET http://localhost:5000/api/courses \
  -H "Authorization: Bearer $TOKEN"
```

Postman:
- Method: GET
- URL: `http://localhost:5000/api/courses`
- Headers: `Authorization: Bearer <TOKEN>`

### Get Course By ID (GET /api/courses/:id)

cURL:

```bash
curl -X GET http://localhost:5000/api/courses/<COURSE_ID> \
  -H "Authorization: Bearer $TOKEN"
```

Postman:
- Method: GET
- URL: `http://localhost:5000/api/courses/<COURSE_ID>`
- Headers: `Authorization: Bearer <TOKEN>`

### Get My Courses (GET /api/courses/my-courses)

cURL:

```bash
curl -X GET http://localhost:5000/api/courses/my-courses \
  -H "Authorization: Bearer $TOKEN"
```

Postman:
- Method: GET
- URL: `http://localhost:5000/api/courses/my-courses`
- Headers: `Authorization: Bearer <TOKEN>`

### Update Course (PUT /api/courses/:id)

cURL:

```bash
curl -X PUT http://localhost:5000/api/courses/<COURSE_ID> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","description":"Updated description"}'
```

Postman:
- Method: PUT
- URL: `http://localhost:5000/api/courses/<COURSE_ID>`
- Headers: `Authorization: Bearer <TOKEN>`
- Body → raw JSON:

  {
    "title": "Updated Title",
    "description": "Updated description"
  }

Only the course owner (instructor who created the course) can update.

### Delete Course (DELETE /api/courses/:id)

cURL:

```bash
curl -X DELETE http://localhost:5000/api/courses/<COURSE_ID> \
  -H "Authorization: Bearer $TOKEN"
```

Postman:
- Method: DELETE
- URL: `http://localhost:5000/api/courses/<COURSE_ID>`
- Headers: `Authorization: Bearer <TOKEN>`

Only the course owner (instructor who created the course) can delete.

---

Notes:
- Replace `<TOKEN>` with the JWT returned from `/api/auth/login`.
- Replace `<COURSE_ID>` with the actual MongoDB ObjectId of the course.
- If you need a Postman Collection file (.json), I can generate and add it.
