import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBadge } from "../components/StatusBadge";
import { PrimaryButton } from "../components/PrimaryButton";
import { EmptyState } from "../components/EmptyState";
import { LoadingView } from "../components/LoadingView";
import { ErrorView } from "../components/ErrorView";
import { getOrdersByUser } from "../services/orderService";
import { getBooks } from "../services/bookService";
import { getErrorMessage } from "../api/client";
import { useAuth, useCart } from "../store/hooks";
import { formatDateTime } from "../utils/format";
import { showMessage } from "../utils/dialog";
import { RootScreenProps } from "../navigation/types";
import { Order } from "../types";
import { colors, formatPrice, radius } from "../theme";

export const PAYMENT_LABEL = { cod: "Thanh toán khi nhận hàng (COD)", bank: "Chuyển khoản ngân hàng" } as const;

export function OrdersScreen({ navigation }: RootScreenProps<"Orders">) {
  const { user, isLoggedIn } = useAuth();
  const { items: cartItems, add, setQty } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null); // đơn đang mở rộng (xem chi tiết ngay tại màn này)
// Cau 5 cau hoi bo sung
  const [statusFilter, setStatusFilter] = useState("all");

  const filters = [
    { label: "Tất cả", value: "all" },
    { label: "Chờ xác nhận", value: "pending" },
    { label: "Đang giao", value: "shipping" },
    { label: "Hoàn tất", value: "completed" },
    { label: "Đã huỷ", value: "cancelled" },
  ];

  // BT9.3a: load orders and sort descending by createdAt
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOrdersByUser(user.id);
      setOrders([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);
//Cau 5 cau hoi bo sung
  const filteredOrders =
  statusFilter === "all"
    ? orders
    : orders.filter((o) => o.status === statusFilter); 

  //BT9.C1 (thử thách "Mua lại"): thêm lại toàn bộ sản phẩm của đơn vào giỏ hiện tại
  const reorder = async (order: Order) => {
    try {
      const books = await getBooks(); // lấy giá và tồn kho mới nhất
      order.items.forEach((it) => {
        const book = books.find((b) => b.id === it.bookId);
        if (!book) return;
        const inCart = cartItems.find((c) => c.bookId === it.bookId);
        if (!inCart) add({ bookId: book.id, title: book.title, price: book.price, emoji: book.emoji, color: book.color, stock: book.stock });
        setQty(it.bookId, (inCart?.quantity ?? 0) + it.quantity);
      });
      showMessage("Đã thêm vào giỏ", "Các sản phẩm của đơn hàng đã được thêm lại vào giỏ.", () =>
        navigation.navigate("Tabs", { screen: "Cart" })
      );
    } catch (e) {
      showMessage("Không thể mua lại", getErrorMessage(e));
    }
  };

  if (!isLoggedIn) {
    return <EmptyState emoji="🔒" title="Bạn cần đăng nhập" actionLabel="Đăng nhập" onAction={() => navigation.navigate("Login")} />;
  }
  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  return (
    <View style={styles.container}>
    {/* Bo loc trang thai don hang */}
    <View style={styles.filterContainer}>
      {filters.map((f) => (
        <Pressable
          key={f.value}
          onPress={() => setStatusFilter(f.value)}
          style={[
            styles.filterButton,
            statusFilter === f.value && styles.activeFilter,
          ]}
        >
          <Text
            style={[
              styles.filterText,
              statusFilter === f.value && styles.activeFilterText,
            ]}
          >
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>

    {/*BT9.3b & BT9.3c: FlatList & ListEmptyComponent */}
    <FlatList
        data={filteredOrders}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ padding: 12, gap: 10, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            emoji="🧾"
            title="Bạn chưa có đơn hàng nào"
            message="Đặt đơn đầu tiên để theo dõi tại đây."
            actionLabel="Mua sắm ngay"
            onAction={() => navigation.navigate("Tabs", { screen: "Home" })}
          />
        }
        renderItem={({ item: o }) => {
          const open = openId === o.id;
          return (
            <View style={styles.card}>
              <Pressable onPress={() => setOpenId(open ? null : o.id)} style={styles.head}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.code}>Đơn #{o.id}</Text>
                  <Text style={styles.date}>{formatDateTime(o.createdAt)}</Text>
                  <Text style={styles.total}>{formatPrice(o.total)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <StatusBadge status={o.status} />
                  <Text style={styles.toggle}>{open ? "Thu gọn ▲" : "Chi tiết ▼"}</Text>
                </View>
              </Pressable>
              {open && (
                <View style={styles.detail}>
                  {o.items.map((it) => (
                    <View key={it.bookId} style={styles.itemRow}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{it.title} × {it.quantity}</Text>
                      <Text style={styles.itemPrice}>{formatPrice(it.price * it.quantity)}</Text>
                    </View>
                  ))}
                  <View style={styles.addr}>
                    <Text style={styles.addrH}>Giao đến</Text>
                    <Text style={styles.addrT}>{o.address.name} · {o.address.phone}</Text>
                    <Text style={styles.addrT}>{o.address.address}</Text>
                    <Text style={styles.addrT}>Thanh toán: {PAYMENT_LABEL[o.paymentMethod]}</Text>
                  </View>
                  {o.status === "completed" && (
                    <PrimaryButton title="Mua lại" variant="outline" onPress={() => reorder(o)} />
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: "#fff", borderRadius: radius.md, padding: 12, gap: 8 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { fontWeight: "800", color: colors.navy, fontSize: 15 },
  date: { fontSize: 12, color: colors.muted },
  total: { fontWeight: "700", color: colors.indigo, marginTop: 2 },
  toggle: { fontSize: 12, fontWeight: "600", color: colors.indigo },
  detail: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, gap: 6 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  itemTitle: { flex: 1, color: colors.text, fontSize: 13 },
  itemPrice: { fontWeight: "600", color: colors.text, fontSize: 13 },
  addr: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 8, gap: 2, marginTop: 4 },
  addrH: { fontWeight: "700", color: colors.navy, fontSize: 12 },
  addrT: { color: colors.muted, fontSize: 12 },

  filterContainer: {
  flexDirection: "row",
  flexWrap: "wrap",
  paddingHorizontal: 12,
  paddingTop: 12,
  paddingBottom: 4,
  gap: 8,
},

filterButton: {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
  backgroundColor: "#E5E7EB",
},

activeFilter: {
  backgroundColor: colors.indigo,
},

filterText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#374151",
},

activeFilterText: {
  color: "#FFFFFF",
},
});