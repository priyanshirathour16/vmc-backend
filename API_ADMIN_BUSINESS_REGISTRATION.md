# Admin Business Registration API Documentation

**Base URL:** `http://localhost:5000/api/admin/businesses`

**Authentication:** All endpoints require JWT token in `Authorization` header  
**Format:** `Authorization: Bearer <JWT_TOKEN>`

**Authorization:** All endpoints require `admin` role

---

## 📋 Table of Contents

1. [List Businesses](#list-businesses)
2. [Get Single Business](#get-single-business)
3. [Create Business](#create-business)
4. [Update Business](#update-business)
5. [Publish/Unpublish Business](#publishunpublish-business)
6. [Verify Business](#verify-business)
7. [Delete Business](#delete-business)
8. [Get Audit Log](#get-audit-log)

---

## List Businesses

**GET** `/api/admin/businesses`

List all businesses with comprehensive filtering, sorting, and pagination support.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `created_by_type` | string | 'all' | Filter by creation source: `'owner'`, `'admin'`, or `'all'` |
| `search` | string | '' | Search by business name, email, or phone number |
| `category_id` | uuid | null | Filter by category UUID |
| `is_verified` | boolean | null | Filter by verification status: `true` or `false` |
| `is_approved` | boolean | null | Filter by approval status: `true` or `false` |
| `is_published` | boolean | null | Filter by publishing status: `true` or `false` |
| `sort_by` | string | 'created_at' | Sort field: `'business_name'`, `'created_at'`, or `'updated_at'` |
| `sort_order` | string | 'desc' | Sort order: `'asc'` or `'desc'` |
| `page` | integer | 1 | Page number (1-indexed) |
| `perpage` | integer | 20 | Items per page (max: 100) |

### Response

```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "business_name": "string",
      "business_category": "uuid",
      "website_url": "string",
      "phone_number": "string",
      "email_business": "string",
      "street_address": "string",
      "city": "string",
      "country": "string",
      "business_logo_url": "string|null",
      "verification_status": "verified|pending|rejected",
      "is_verified": "boolean",
      "is_approved": "boolean",
      "is_published": "boolean",
      "created_by_type": "owner|admin",
      "admin_created_by": "uuid|null",
      "created_at": "ISO8601",
      "updated_at": "ISO8601",
      "avg_rating": "number|null"
    }
  ],
  "pagination": {
    "page": 1,
    "perpage": 20,
    "total": 150,
    "pages": 8
  },
  "filters": {
    "created_by_type": "admin",
    "search": "",
    "category_id": null,
    "is_verified": true,
    "is_approved": null,
    "is_published": true
  }
}
```

### Example Request

```bash
curl -X GET 'http://localhost:5000/api/admin/businesses?created_by_type=admin&is_verified=true&sort_by=created_at&sort_order=desc&page=1&perpage=20' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

---

## Get Single Business

**GET** `/api/admin/businesses/:businessId`

Retrieve full details for a single business.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `businessId` | uuid | The business ID |

### Response

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "business_name": "string",
    "business_category": "uuid",
    "website_url": "string",
    "phone_number": "string",
    "email_business": "string",
    "street_address": "string",
    "city": "string",
    "country": "string",
    "business_logo_url": "string|null",
    "verification_status": "verified|pending|rejected",
    "is_verified": "boolean",
    "is_approved": "boolean",
    "is_published": "boolean",
    "created_by_type": "owner|admin",
    "admin_created_by": "uuid|null",
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  }
}
```

---

## Create Business

**POST** `/api/admin/businesses`

Create a new business (admin registration). This endpoint auto-sets verification and publishing status.

### Request Body

**Required Fields:**
- `business_name` (string, 3-150 chars)
- `business_category` (uuid)
- `website_url` (string, must be valid URL)
- `street_address` (string, 5-255 chars)
- `city` (string, 2-100 chars)
- `country` (string, 2-100 chars)
- `phone_number` (string, min 10 digits)

**Optional Fields:**
- `state_province` (string, 2-100 chars)
- `postal_code` (string, max 20 chars)
- `email_business` (string, valid email)
- `business_description` (string, max 1000 chars)
- `business_logo_url` (string, valid URL)
- `opening_hours` (object)
- `latitude` (number, -90 to 90)
- `longitude` (number, -180 to 180)

**Auto-Set Fields (cannot be overridden):**
- `created_by_type`: 'admin'
- `admin_created_by`: current admin ID
- `verification_status`: 'verified'
- `is_verified`: true
- `is_published`: true
- `is_approved`: true

### Request Example

```json
{
  "business_name": "Tech Innovations Ltd",
  "business_category": "550e8400-e29b-41d4-a716-446655440000",
  "website_url": "https://techinnovations.com",
  "street_address": "123 Tech Street, Innovation Park",
  "city": "San Francisco",
  "state_province": "California",
  "postal_code": "94102",
  "country": "United States",
  "phone_number": "+1 (415) 555-0123",
  "email_business": "contact@techinnovations.com",
  "business_description": "Leading technology solutions provider"
}
```

### Response

```json
{
  "status": "success",
  "message": "Business created successfully",
  "data": {
    "id": "uuid",
    "business_name": "Tech Innovations Ltd",
    "created_by_type": "admin",
    "admin_created_by": "uuid",
    "verification_status": "verified",
    "is_verified": true,
    "is_published": true,
    "created_at": "ISO8601"
  }
}
```

---

## Update Business

**PUT** `/api/admin/businesses/:businessId`

Update business details (admin-created businesses only).

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `businessId` | uuid | The business ID |

### Request Body

All fields are optional (send only what you want to update):

```json
{
  "business_name": "string (optional)",
  "business_category": "uuid (optional)",
  "website_url": "string (optional)",
  "street_address": "string (optional)",
  "city": "string (optional)",
  "state_province": "string (optional)",
  "postal_code": "string (optional)",
  "country": "string (optional)",
  "phone_number": "string (optional)",
  "email_business": "string (optional)",
  "business_description": "string (optional)",
  "business_logo_url": "string (optional)",
  "opening_hours": "object (optional)",
  "latitude": "number (optional)",
  "longitude": "number (optional)",
  "is_approved": "boolean (optional)",
  "is_verified": "boolean (optional)"
}
```

### Response

```json
{
  "status": "success",
  "message": "Business updated successfully",
  "data": {
    "id": "uuid",
    "business_name": "updated",
    "updated_at": "ISO8601"
  }
}
```

---

## Publish/Unpublish Business

**PATCH** `/api/admin/businesses/:businessId/publish`

Publish or unpublish a business (controls visibility in directory).

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `businessId` | uuid | The business ID |

### Request Body

```json
{
  "is_published": true
}
```

### Response

```json
{
  "status": "success",
  "message": "Business published successfully",
  "data": {
    "id": "uuid",
    "is_published": true,
    "updated_at": "ISO8601"
  }
}
```

---

## Verify Business

**PATCH** `/api/admin/businesses/:businessId/verify`

Set verification status for a business (verified, pending, or rejected).

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `businessId` | uuid | The business ID |

### Request Body

```json
{
  "verification_status": "verified"
}
```

**Valid values:**
- `"verified"` - Mark as verified
- `"pending"` - Mark as pending verification
- `"rejected"` - Mark as rejected

### Response

```json
{
  "status": "success",
  "message": "Business marked as verified",
  "data": {
    "id": "uuid",
    "verification_status": "verified",
    "is_verified": true,
    "updated_at": "ISO8601"
  }
}
```

---

## Delete Business

**DELETE** `/api/admin/businesses/:businessId`

Soft delete (unpublish) a business. The business record remains in database but becomes invisible.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `businessId` | uuid | The business ID |

### Response

```json
{
  "status": "success",
  "message": "Business unpublished successfully",
  "data": {
    "id": "uuid",
    "is_published": false,
    "updated_at": "ISO8601"
  }
}
```

---

## Get Audit Log

**GET** `/api/admin/businesses/:businessId/audit-log`

Get the audit trail (history of all admin actions) for a specific business.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `businessId` | uuid | The business ID |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Number of records (max: 200) |

### Response

```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "admin_id": "uuid",
      "action_type": "business_create|business_update|business_publish|business_delete",
      "target_id": "uuid",
      "target_type": "profile_business_owner",
      "changes": "{...}",
      "created_at": "ISO8601"
    }
  ],
  "count": 5
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "status": "error",
  "message": "Validation error message"
}
```

### 401 Unauthorized

```json
{
  "status": "error",
  "message": "No token provided"
}
```

### 403 Forbidden

```json
{
  "status": "error",
  "message": "Forbidden: Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "status": "error",
  "message": "Business not found"
}
```

### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "Database error: ..."
}
```

---

## Key Features

✅ **Comprehensive Filtering:** Filter by creation source, verification status, publication status, category  
✅ **Sorting Support:** Sort by business name, creation date, or update date (ascending/descending)  
✅ **Pagination:** Support for offset-based pagination with configurable page size  
✅ **Authentication:** All endpoints require valid JWT token with admin role  
✅ **Audit Logging:** All admin actions automatically logged to `audit_logs` table  
✅ **Auto-Verification:** Admin-created businesses automatically marked as verified and published  
✅ **Data Tracking:** Records whether business was created by owner or admin with admin ID reference  

## Database Schema Notes

- Business data stored in `profile_business_owner` table
- Admin actions logged in `audit_logs` table
- New columns added: `created_by_type`, `admin_created_by`, `is_published`
- Indexes created for optimal query performance on admin operations

