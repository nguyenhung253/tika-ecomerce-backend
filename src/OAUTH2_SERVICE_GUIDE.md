# 🔐 OAUTH2 SERVICE - HƯỚNG DẪN CHI TIẾT

## 📚 Tổng quan

OAuth2 Service quản lý việc xác thực người dùng thông qua các nhà cung cấp OAuth2 bên thứ ba (Google, Facebook, GitHub). Service này xử lý toàn bộ flow từ đăng nhập, liên kết tài khoản, đến quản lý các provider đã kết nối.

## 🎯 Các chức năng chính

OAuth2 Service có **6 chức năng chính**:

### 1. **Authentication Operations**
- ✅ `handleOAuthLogin()` - Xử lý đăng nhập/đăng ký qua OAuth provider
- ✅ `refreshOAuthToken()` - Làm mới OAuth access token

### 2. **Provider Management**
- ✅ `getAllProviders()` - Lấy tất cả providers đã liên kết của user
- ✅ `linkProvider()` - Liên kết thêm OAuth provider vào tài khoản
- ✅ `unlinkProvider()` - Hủy liên kết OAuth provider
- ✅ `updateProviderInfo()` - Cập nhật thông tin provider

---

## 🔧 Chi tiết từng chức năng

## 1. GET ALL PROVIDERS - Lấy tất cả providers đã liên kết

### 📝 Mô tả
Lấy danh sách tất cả OAuth providers mà user đã liên kết với tài khoản (Google, Facebook, GitHub).

### 📥 Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | ObjectId | ✅ Yes | ID của user cần lấy providers |
| `providerId` | String | ❌ No | Filter theo specific provider ID (optional) |

### 🔄 Flow thực hiện (Step by step)

#### **Step 1: Validation Input**
- Kiểm tra `userId` có được truyền vào không
- Kiểm tra `userId` có đúng format ObjectId không
- Nếu có `providerId`, kiểm tra format có hợp lệ không
- Validate providerId không chứa ký tự đặc biệt nguy hiểm

#### **Step 2: Build Query Filter**
- Tạo object query rỗng: `queryFilter = {}`
- Thêm userId vào query: `queryFilter.userId = userId`
- Nếu có `providerId` được truyền vào:
  - Thêm vào query filter: `queryFilter.providerId = providerId`
- Nếu không có `providerId`:
  - Chỉ query theo userId để lấy tất cả providers

#### **Step 3: Query Database**
- Sử dụng `OAuthProviderModel.find()` với queryFilter đã build
- Select các fields cần thiết:
  - Bao gồm: `_id`, `provider`, `providerId`, `profile.email`, `profile.name`, `profile.avatar`, `createdAt`
  - Loại bỏ: `accessToken`, `refreshToken` (sensitive data)
- Sort kết quả theo `createdAt` giảm dần (provider mới nhất lên đầu)
- Sử dụng `.lean()` để optimize performance (return plain JavaScript object)

#### **Step 4: Check Result Empty**
- Lưu kết quả query vào biến `providers`
- Kiểm tra `providers` có phải array rỗng không (`providers.length === 0`)
- Nếu rỗng VÀ có `providerId` cụ thể:
  - Có thể là provider không tồn tại
  - Log warning: "Provider not found"
- Nếu rỗng VÀ không có `providerId`:
  - User chưa liên kết provider nào
  - Đây là trường hợp bình thường

#### **Step 5: Transform Data** 
- Map qua từng provider trong array `providers`
- Với mỗi provider, thực hiện:
  - Extract thông tin cần thiết từ nested object `profile`
  - Format ngày tháng `createdAt` sang readable format
  - Thêm flag `isActive: true` (vì provider đang tồn tại)
  - Đổi tên field `createdAt` thành `linkedAt` cho dễ hiểu
  - Tạo object mới với structure clean hơn
- Lưu kết quả transform vào biến `transformedProviders`

#### **Step 6: Build Metadata**
- Tính tổng số providers: `total = transformedProviders.length`
- Tạo object metadata chứa:
  - `total`: số lượng providers
  - `userId`: userId đã query
  - Có thể thêm: `hasGoogle`, `hasFacebook`, `hasGithub` (boolean flags)

#### **Step 7: Return Response**
- Nếu có kết quả:
  - Return object chứa `providers` array và `metadata`
- Nếu rỗng:
  - Vẫn return object với `providers: []` và `metadata.total: 0`
- Format response theo chuẩn của API

### 📤 Output Response

**Success Case (Có providers):**
```json
{
  "providers": [
    {
      "_id": "provider_id_1",
      "provider": "google",
      "providerId": "google_user_id_123",
      "email": "user@gmail.com",
      "name": "John Doe",
      "avatar": "https://avatar-url.jpg",
      "isActive": true,
      "linkedAt": "2024-01-15T10:30:00Z"
    },
    {
      "_id": "provider_id_2",
      "provider": "facebook",
      "providerId": "facebook_user_id_456",
      "email": "user@gmail.com",
      "name": "John Doe",
      "avatar": "https://fb-avatar.jpg",
      "isActive": true,
      "linkedAt": "2024-01-10T08:20:00Z"
    }
  ],
  "metadata": {
    "total": 2,
    "userId": "user_id_123",
    "hasGoogle": true,
    "hasFacebook": true,
    "hasGithub": false
  }
}
```

**Success Case (Không có providers):**
```json
{
  "providers": [],
  "metadata": {
    "total": 0,
    "userId": "user_id_123",
    "hasGoogle": false,
    "hasFacebook": false,
    "hasGithub": false
  }
}
```

### ⚠️ Error Cases

| Error Type | Condition | Error Message |
|-----------|-----------|---------------|
| BadRequestError | `userId` không được truyền | "userId is required" |
| BadRequestError | `userId` format không hợp lệ | "Invalid userId format" |
| NotFoundError | User không tồn tại trong hệ thống | "User not found" |
| InternalServerError | Database query failed | "Failed to fetch providers" |

### 💡 Use Cases

**Use Case 1: Lấy tất cả providers của user**
- Frontend gọi API với chỉ `userId`
- Backend return toàn bộ providers đã link
- Hiển thị trong trang account settings

**Use Case 2: Check user có link Google chưa**
- Frontend gọi API với `userId` và `providerId = "google_123"`
- Nếu return empty → Chưa link → Show "Link Google" button
- Nếu return data → Đã link → Show "Unlink Google" button

---

## 2. UNLINK PROVIDER - Hủy liên kết OAuth provider

### 📝 Mô tả
Xóa/hủy liên kết một OAuth provider khỏi tài khoản user. User sẽ không thể đăng nhập bằng provider này nữa.

### 📥 Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | ObjectId | ✅ Yes | ID của user |
| `provider` | String | ✅ Yes | Tên provider cần unlink ('google', 'facebook', 'github') |

### 🔄 Flow thực hiện (Step by step)

#### **Step 1: Validation Input**
- Kiểm tra `userId` có được truyền vào không
- Kiểm tra `provider` có được truyền vào không
- Validate `provider` phải nằm trong whitelist: `['google', 'facebook', 'github']`
- Nếu provider không hợp lệ → Throw BadRequestError
- Kiểm tra `userId` có đúng format ObjectId không

#### **Step 2: Check User Exists**
- Query User/Shop model theo `userId`
- Sử dụng `.lean()` để get plain object
- Lưu kết quả vào biến `user`
- Nếu `user` không tồn tại → Throw NotFoundError "User not found"

#### **Step 3: Count User's Providers**
- Query `OAuthProviderModel.countDocuments({ userId })`
- Lưu kết quả vào biến `totalProviders`
- Đếm xem user hiện có bao nhiêu OAuth providers đã link

#### **Step 4: Check User Has Password**
- Kiểm tra field `user.password` có tồn tại không
- Lưu vào biến boolean `hasPassword`
- `hasPassword = true` → User có thể login bằng email/password
- `hasPassword = false` → User chỉ có thể login qua OAuth

#### **Step 5: Business Logic Validation**
- Kiểm tra điều kiện: `totalProviders === 1 && hasPassword === false`
- Nếu TRUE:
  - User chỉ có 1 provider duy nhất VÀ không có password
  - Không cho phép unlink → User sẽ không thể login
  - Throw ForbiddenError: "Cannot unlink the last authentication method. Please set a password first."
- Nếu FALSE:
  - User có nhiều providers HOẶC có password
  - Cho phép unlink → Continue to next step

#### **Step 6: Find Provider to Unlink**
- Query `OAuthProviderModel` với filter: `{ userId, provider }`
- Lưu kết quả vào biến `providerRecord`
- Kiểm tra `providerRecord` có tồn tại không
- Nếu không tồn tại:
  - Provider chưa được link với user này
  - Throw NotFoundError: "Provider not linked to this account"

#### **Step 7: Extract Provider Info (for logging)**
- Lưu lại thông tin provider trước khi xóa:
  - `providerId` từ `providerRecord.providerId`
  - `linkedDate` từ `providerRecord.createdAt`
  - `providerEmail` từ `providerRecord.profile.email`
- Thông tin này dùng cho logging và response

#### **Step 8: Revoke OAuth Token (Optional)**
- Check provider có support token revocation không:
  - Google: YES → Call revoke API
  - Facebook: Limited support
  - GitHub: YES → Call revoke API
- Nếu support:
  - Get `accessToken` từ `providerRecord`
  - Call provider's revoke endpoint
  - Wrap trong try-catch (nếu fail không block unlink)
  - Log warning nếu revoke thất bại

#### **Step 9: Delete Provider Record**
- Sử dụng `OAuthProviderModel.findOneAndDelete()`
- Filter: `{ _id: providerRecord._id }` (hoặc `{ userId, provider }`)
- Lưu kết quả delete vào biến `deletedProvider`
- Kiểm tra `deletedProvider` có null không
- Nếu null → Delete failed → Throw InternalServerError

#### **Step 10: Update User Model (If applicable)**
- Nếu User model có field `linkedProviders` array:
  - Remove provider name khỏi array
  - Sử dụng `$pull` operator
  - Update user document
- Nếu không có field này → Skip step này

#### **Step 11: Create Activity Log**
- Tạo log entry cho hành động unlink:
  - `action: "UNLINK_PROVIDER"`
  - `userId: userId`
  - `provider: provider`
  - `providerId: providerId`
  - `timestamp: new Date()`
  - `ipAddress: req.ip` (nếu có)
- Save log vào ActivityLog collection (nếu có)

#### **Step 12: Send Notification Email (Optional)**
- Gửi email thông báo user về việc unlink:
  - Subject: "OAuth Provider Unlinked"
  - Body: Include provider name, unlink time
  - Security notice: "If this wasn't you, please contact support"
- Wrap trong try-catch (không block response nếu email fail)

#### **Step 13: Build Success Response**
- Tạo response object:
  - `success: true`
  - `message: "Provider unlinked successfully"`
  - `provider: provider name`
  - `unlinkedAt: timestamp`
- Return response object

### 📤 Output Response

**Success Case:**
```json
{
  "success": true,
  "message": "Provider unlinked successfully",
  "data": {
    "provider": "google",
    "providerId": "google_user_id_123",
    "unlinkedAt": "2024-01-15T10:30:00Z"
  }
}
```

### ⚠️ Error Cases

| Error Type | Condition | Error Message |
|-----------|-----------|---------------|
| BadRequestError | Provider không được truyền | "Provider is required" |
| BadRequestError | Provider không hợp lệ | "Invalid provider. Must be one of: google, facebook, github" |
| NotFoundError | User không tồn tại | "User not found" |
| NotFoundError | Provider chưa được link | "Provider not linked to this account" |
| ForbiddenError | Không thể unlink provider duy nhất | "Cannot unlink the last authentication method. Please set a password first." |
| InternalServerError | Delete operation failed | "Failed to unlink provider" |

### 💡 Use Cases

**Use Case 1: User muốn unlink Google**
- User có: Google + Facebook + Password
- User click "Unlink Google" button
- System check: User còn 2 methods khác → Allow
- Delete Google provider → Success

**Use Case 2: User muốn unlink provider cuối cùng (Blocked)**
- User chỉ có: Google (không có password)
- User click "Unlink Google"
- System check: Chỉ có 1 provider, no password → Block
- Return error: "Please set password first"

**Use Case 3: User set password rồi unlink**
- User ban đầu chỉ có Google
- User vào settings → Set password
- Sau đó unlink Google → Success
- User giờ login bằng email/password

---

## 3. UPDATE PROVIDER INFO - Cập nhật thông tin provider

### 📝 Mô tả
Cập nhật thông tin của OAuth provider (access token, refresh token, profile info) khi user login lại hoặc refresh token.

### 📥 Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | ObjectId | ✅ Yes | ID của user |
| `provider` | String | ✅ Yes | Tên provider ('google', 'facebook', 'github') |
| `accessToken` | String | ❌ No | OAuth access token mới |
| `refreshToken` | String | ❌ No | OAuth refresh token mới |
| `profile` | Object | ❌ No | Thông tin profile mới từ provider |

### 🔄 Flow thực hiện (Step by step)

#### **Step 1: Validation Input - Required Fields**
- Kiểm tra `userId` có được truyền không
- Kiểm tra `provider` có được truyền không
- Validate `userId` format là ObjectId hợp lệ
- Validate `provider` nằm trong whitelist

#### **Step 2: Validation Input - Update Fields**
- Kiểm tra ít nhất 1 trong 3 fields được truyền:
  - `accessToken` HOẶC
  - `refreshToken` HOẶC
  - `profile`
- Nếu cả 3 đều không có:
  - Throw BadRequestError: "No fields to update"
- Lưu các fields có giá trị vào array `fieldsToUpdate`

#### **Step 3: Validate Token Format (If provided)**
- Nếu có `accessToken`:
  - Check không phải empty string
  - Check length hợp lý (> 10 characters)
  - Có thể check format nếu biết pattern
- Nếu có `refreshToken`:
  - Validate tương tự accessToken
- Nếu invalid → Throw BadRequestError

#### **Step 4: Validate Profile Object (If provided)**
- Nếu có `profile`:
  - Check `profile` là object (không phải string/array)
  - Validate các fields trong profile:
    - `email`: Phải hợp lệ email format (nếu có)
    - `name`: Không empty (nếu có)
    - `avatar`: Valid URL (nếu có)
  - Nếu invalid → Throw BadRequestError

#### **Step 5: Find Existing Provider**
- Query `OAuthProviderModel` với filter: `{ userId, provider }`
- Lưu kết quả vào biến `existingProvider`
- Kiểm tra `existingProvider` có null không
- Nếu null:
  - Provider chưa được link
  - Throw NotFoundError: "Provider not found for this user"

#### **Step 6: Build Update Object**
- Khởi tạo object rỗng: `updateData = {}`
- Nếu có `accessToken`:
  - Thêm vào: `updateData.accessToken = accessToken`
- Nếu có `refreshToken`:
  - Thêm vào: `updateData.refreshToken = refreshToken`
- Nếu có `profile`:
  - Merge với profile cũ (không overwrite hoàn toàn)
  - `updateData.profile = { ...existingProvider.profile, ...profile }`
- Thêm timestamp: `updateData.updatedAt = new Date()`

#### **Step 7: Validate New Access Token (Optional)**
- Nếu update `accessToken` VÀ provider là Google/GitHub:
  - Có thể verify token với provider's endpoint
  - Call API: `GET https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=...`
  - Check response status
  - Nếu token invalid:
    - Option 1: Throw error "Invalid access token"
    - Option 2: Log warning nhưng vẫn lưu
- Wrap trong try-catch để không block update

#### **Step 8: Compare Changes**
- So sánh `updateData` với `existingProvider`
- Check xem có field nào thực sự thay đổi không:
  - Nếu accessToken mới === accessToken cũ → No change
  - Nếu profile mới === profile cũ → No change
- Nếu không có gì thay đổi:
  - Option 1: Return success ngay (skip database update)
  - Option 2: Vẫn update để refresh `updatedAt`

#### **Step 9: Update Database**
- Sử dụng `OAuthProviderModel.findOneAndUpdate()`
- Parameters:
  - Filter: `{ _id: existingProvider._id }`
  - Update: `{ $set: updateData }`
  - Options: `{ new: true, runValidators: true }`
- `new: true` → Return document sau khi update
- `runValidators` → Chạy validation của schema
- Lưu kết quả vào `updatedProvider`

#### **Step 10: Check Update Success**
- Kiểm tra `updatedProvider` có null không
- Nếu null:
  - Update failed
  - Throw InternalServerError: "Failed to update provider"
- Nếu có data → Update thành công

#### **Step 11: Log Update Activity**
- Tạo activity log:
  - `action: "UPDATE_PROVIDER"`
  - `userId: userId`
  - `provider: provider`
  - `fieldsUpdated: fieldsToUpdate` (array)
  - `timestamp: new Date()`
- Save vào log collection

#### **Step 12: Transform Response Data**
- Loại bỏ sensitive fields:
  - Remove `accessToken` (security)
  - Remove `refreshToken` (security)
- Chỉ return thông tin cần thiết:
  - `provider`, `profile`, `updatedAt`
- Convert Mongoose document → Plain object

#### **Step 13: Return Success Response**
- Build response object:
  - `success: true`
  - `message: "Provider updated successfully"`
  - `data: transformedProvider`
- Return response

### 📤 Output Response

**Success Case:**
```json
{
  "success": true,
  "message": "Provider updated successfully",
  "data": {
    "_id": "provider_id_123",
    "provider": "google",
    "profile": {
      "email": "user@gmail.com",
      "name": "John Doe Updated",
      "avatar": "https://new-avatar-url.jpg"
    },
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### ⚠️ Error Cases

| Error Type | Condition | Error Message |
|-----------|-----------|---------------|
| BadRequestError | Không có field nào để update | "No fields to update. Provide accessToken, refreshToken, or profile" |
| BadRequestError | Token format không hợp lệ | "Invalid token format" |
| BadRequestError | Profile object invalid | "Invalid profile data" |
| NotFoundError | Provider không tồn tại | "Provider not found for this user" |
| BadRequestError | Access token không valid | "Invalid or expired access token" |
| InternalServerError | Update failed | "Failed to update provider information" |

### 💡 Use Cases

**Use Case 1: User login lại bằng Google**
- User đã link Google từ trước
- User login lại → Google trả về token mới
- System call updateProviderInfo:
  - Update accessToken mới
  - Update refreshToken mới (nếu có)
  - Update profile (tên có thể đã đổi)

**Use Case 2: Refresh expired token**
- Access token của Google đã expired
- System dùng refresh token lấy access token mới
- Call updateProviderInfo chỉ update accessToken

**Use Case 3: Sync profile changes**
- User đổi avatar trên Google
- Khi user login lại → Profile mới được lấy về
- Update profile trong database để sync

---

## 4. LINK PROVIDER - Liên kết thêm OAuth provider

### 📝 Mô tả
Liên kết thêm một OAuth provider mới vào tài khoản user đã tồn tại. Cho phép user đăng nhập bằng nhiều phương thức khác nhau.

### 📥 Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | ObjectId | ✅ Yes | ID của user hiện tại (đã đăng nhập) |
| `provider` | String | ✅ Yes | Tên provider muốn link ('google', 'facebook', 'github') |
| `providerId` | String | ✅ Yes | ID của user trên provider (provider's user ID) |
| `accessToken` | String | ✅ Yes | Access token từ provider |
| `refreshToken` | String | ❌ No | Refresh token từ provider (optional) |
| `profile` | Object | ✅ Yes | Profile info từ provider (email, name, avatar) |

### 🔄 Flow thực hiện (Step by step)

#### **Step 1: Validation Required Fields**
- Kiểm tra các required fields:
  - `userId` có được truyền không
  - `provider` có được truyền không
  - `providerId` có được truyền không
  - `accessToken` có được truyền không
  - `profile` có được truyền không
- Nếu thiếu field nào → Throw BadRequestError

#### **Step 2: Validate Provider Whitelist**
- Check `provider` có nằm trong whitelist không:
  - Whitelist: `['google', 'facebook', 'github']`
- Nếu không hợp lệ:
  - Throw BadRequestError: "Invalid provider"

#### **Step 3: Validate Profile Object**
- Kiểm tra `profile` object có đầy đủ fields:
  - `profile.email` (required) → Validate email format
  - `profile.name` (required) → Không empty
  - `profile.avatar` (optional) → Validate URL nếu có
- Nếu thiếu email hoặc name:
  - Throw BadRequestError: "Profile must include email and name"

#### **Step 4: Check User Exists**
- Query User/Shop model theo `userId`
- Lưu kết quả vào biến `user`
- Kiểm tra `user` có null không
- Nếu null:
  - User không tồn tại
  - Throw NotFoundError: "User not found"
- Extract `user.email` để dùng ở step sau

#### **Step 5: Check Provider Already Linked to This User**
- Query `OAuthProviderModel`:
  - Filter: `{ userId, provider }`
- Lưu kết quả vào `existingProviderForUser`
- Kiểm tra `existingProviderForUser` có tồn tại không
- Nếu tồn tại:
  - User đã link provider này rồi
  - Throw ConflictError: "This provider is already linked to your account"

#### **Step 6: Check ProviderId Conflict**
- Query `OAuthProviderModel`:
  - Filter: `{ provider, providerId }`
- Lưu kết quả vào `existingProviderById`
- Kiểm tra `existingProviderById` có tồn tại không
- Nếu tồn tại:
  - Check `existingProviderById.userId !== userId`
  - ProviderId này đã được user KHÁC sử dụng
  - Throw ConflictError: "This provider account is already linked to another user"

#### **Step 7: Validate Email Match**
- So sánh email:
  - `profile.email` vs `user.email`
- Nếu khác nhau:
  - **Option A (Strict)**: Throw error "Email mismatch"
  - **Option B (Flexible)**: Log warning nhưng cho phép link
  - **Option C (Ask User)**: Return warning, yêu cầu user confirm
- Tuỳ theo business requirements chọn option phù hợp

#### **Step 8: Verify Access Token with Provider**
- Call API của provider để verify token:
  - **Google**: `GET https://www.googleapis.com/oauth2/v1/tokeninfo?access_token={token}`
  - **Facebook**: `GET https://graph.facebook.com/me?access_token={token}`
  - **GitHub**: `GET https://api.github.com/user` với header `Authorization: token {token}`
- Check response:
  - Status 200 → Token valid
  - Status 401 → Token invalid
- Extract `userIdFromToken` từ response
- Verify `userIdFromToken === providerId`
- Nếu không match:
  - Throw BadRequestError: "Invalid access token for this provider account"

#### **Step 9: Prepare Provider Data**
- Tạo object `providerData`:
  - `userId: userId`
  - `provider: provider`
  - `providerId: providerId`
  - `accessToken: accessToken`
  - `refreshToken: refreshToken` (nếu có)
  - `profile: { email, name, avatar }`
  - `createdAt: new Date()`
  - `updatedAt: new Date()`

#### **Step 10: Create Provider Record**
- Create document mới trong `OAuthProviderModel`:
  - Data: `providerData`
- Lưu kết quả vào `newProvider`
- Kiểm tra creation thành công:
  - Nếu `newProvider` null → Throw InternalServerError
- Có thể dùng `create()` hoặc `insertOne()`

#### **Step 11: Update User Model (Optional)**
- Nếu User model có field `linkedProviders` (array):
  - Push provider name vào array:
    - `user.linkedProviders.push(provider)`
  - Update user document:
    - `User.updateOne({ _id: userId }, { $addToSet: { linkedProviders: provider } })`
  - `$addToSet` → Tránh duplicate
- Nếu không có field này → Skip step

#### **Step 12: Create Activity Log**
- Log hành động link provider:
  - `action: "LINK_PROVIDER"`
  - `userId: userId`
  - `provider: provider`
  - `providerId: providerId`
  - `timestamp: new Date()`
  - `ipAddress: req.ip`
- Save vào ActivityLog collection

#### **Step 13: Send Notification Email**
- Gửi email thông báo:
  - To: `user.email`
  - Subject: "New OAuth Provider Linked"
  - Body:
    - Provider name đã được link
    - Thời gian link
    - Security notice: "If this wasn't you, please contact support immediately"
- Wrap trong try-catch (không block response nếu email fail)
- Log error nếu send fail

#### **Step 14: Transform Response Data**
- Remove sensitive data:
  - `accessToken`, `refreshToken`
- Prepare response object:
  - `_id`, `provider`, `providerId`
  - `profile: { email, name, avatar }`
  - `linkedAt: createdAt`

#### **Step 15: Return Success Response**
- Build response:
  - `success: true`
  - `message: "Provider linked successfully"`
  - `data: transformedProvider`
- Return response

### 📤 Output Response

**Success Case:**
```json
{
  "success": true,
  "message": "