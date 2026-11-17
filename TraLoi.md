# Câu hỏi bổ sung

## 1. Giá trị dẫn xuất
Trong Checkout, `errors` và `valid` được tính trực tiếp mỗi lần render vì chúng là dữ liệu dẫn xuất từ giá trị form hiện tại. Không cần dùng `useState` riêng vì sẽ gây dư thừa trạng thái. Nếu dùng `useState`, khi dữ liệu form thay đổi mà không cập nhật errors hoặc valid thì giao diện có thể bị sai lệch, không đồng bộ.

## 2. Thứ tự gọi
Nếu gọi `clear()` trước `await createOrder(...)`, khi mất mạng giỏ hàng sẽ bị xóa dù đơn hàng chưa được tạo thành công, khiến người dùng mất dữ liệu sản phẩm. Đặt `clear()` ngay sau `createOrder()` giúp chỉ xóa giỏ hàng khi tạo đơn thành công, còn khi lỗi thì người dùng vẫn có thể thử lại.

## 3. PUT hay PATCH
Nếu dùng `PUT /users/1` với `{ name, phone }`, toàn bộ dữ liệu user có thể bị thay thế bằng hai trường này, làm mất các trường khác như `email` hoặc `password`. Bài này chọn `PATCH` vì chỉ cập nhật các trường cần thay đổi và giữ nguyên những dữ liệu còn lại.

## 4. Cập nhật lạc quan
Nếu bỏ đoạn hoàn lại `read: false` trong `catch`, khi mất mạng thông báo vẫn hiển thị đã đọc dù máy chủ chưa cập nhật thành công, gây sai lệch dữ liệu giữa giao diện và server. Cách này có thể áp dụng cho thao tác thêm hoặc bỏ yêu thích, nhưng không nên dùng cho thanh toán vì cần xác nhận thành công từ server trước khi cập nhật trạng thái cuối cùng.

## 5. Code bổ sung

Thêm bộ lọc trạng thái ở màn Đơn hàng bằng state:

```tsx
const [statusFilter, setStatusFilter] = useState("all");

const filters = [
  { label: "Tất cả", value: "all" },
  { label: "Chờ xác nhận", value: "pending" },
  { label: "Đang giao", value: "shipping" },
  { label: "Hoàn tất", value: "completed" },
  { label: "Đã huỷ", value: "cancelled" },
];

const filteredOrders =
  statusFilter === "all"
    ? orders
    : orders.filter(
        (item) => item.status === statusFilter
      );
```

Thêm giao diện bộ lọc phía trên FlatList:

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
  {filters.map((f) => (
    <Pressable
      key={f.value}
      onPress={() => setStatusFilter(f.value)}
      style={{
        padding: 10,
        borderRadius: 20,
        backgroundColor:
          statusFilter === f.value ? "#2563EB" : "#E5E7EB",
      }}
    >
      <Text style={{
        color: statusFilter === f.value ? "white" : "#333",
      }}>
        {f.label}
      </Text>
    </Pressable>
  ))}
</View>
```

Sửa dữ liệu truyền cho FlatList:

```tsx
<FlatList
  data={filteredOrders}
  keyExtractor={(o) => String(o.id)}
  renderItem={({ item: o }) => {
    // Giữ nguyên renderItem hiện tại
  }}
/>
```