"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Wifi, WifiOff, FolderOpen, Package, Tag, Plus, Utensils, Truck } from "lucide-react";
import { AdminOrdersList } from "@/components/admin/AdminOrdersList";
import { AdminOrderDetailModal } from "@/components/admin/AdminOrderDetailModal";
import { AdminProductsList } from "@/components/admin/AdminProductsList";
import { AdminCategoriesList } from "@/components/admin/AdminCategoriesList";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ProductForm } from "@/components/admin/ProductForm";
import { useToast } from "@/components/admin/Toast";
import { useAdminOrdersRealtime, type RealtimeConnectionStatus } from "@/components/admin/useAdminOrdersRealtime";
import { useAdminCategoriesRealtime } from "@/components/admin/useAdminCategoriesRealtime";
import {
  getAdminOrderDetail,
  updateOrderStatus,
  toggleProductAvailability,
  listAdminOrders,
  listAdminProducts,
  listAdminCategories,
  createCategory,
  updateCategory,
  archiveCategory,
  deleteCategory,
  reorderCategories,
  createProduct,
  updateProduct,
  archiveProduct,
  deleteProduct,
  type AdminOrderListItem,
  type AdminProductListItem,
  type AdminOrderDetail,
  type AdminCategoryListItem,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type ArchiveCategoryInput,
  type CreateProductInput,
  type UpdateProductInput,
  type ArchiveProductInput,
  type DeleteProductInput,
  type DeleteCategoryInput,
} from "@/lib/actions/admin";

interface AdminDashboardContentProps {
  initialOrders: AdminOrderListItem[];
  initialOrdersError: string | null;
  initialProducts: AdminProductListItem[];
  initialProductsError: string | null;
  initialCategories: AdminCategoryListItem[];
  initialCategoriesError: string | null;
}

const CONNECTION_STATUS_LABELS: Record<RealtimeConnectionStatus, string> = {
  connecting: "Conectando…",
  connected: "Conectado",
  error: "Error de conexión",
  disconnected: "Desconectado",
};

const CONNECTION_STATUS_ICONS: Record<RealtimeConnectionStatus, React.ReactNode> = {
  connecting: <Wifi className="h-4 w-4 animate-pulse" aria-hidden="true" />,
  connected: <Wifi className="h-4 w-4 text-emerald-400" aria-hidden="true" />,
  error: <WifiOff className="h-4 w-4 text-amber-400" aria-hidden="true" />,
  disconnected: <WifiOff className="h-4 w-4 text-cream-dim" aria-hidden="true" />,
};

const CONNECTION_STATUS_COLORS: Record<RealtimeConnectionStatus, string> = {
  connecting: "text-amber-400",
  connected: "text-emerald-400",
  error: "text-amber-400",
  disconnected: "text-cream-dim",
};

const SECTION_ICONS = {
  orders: <Package className="h-5 w-5" aria-hidden="true" />,
  products: <Tag className="h-5 w-5" aria-hidden="true" />,
  categories: <FolderOpen className="h-5 w-5" aria-hidden="true" />,
};

type Section = "orders" | "products" | "categories";

export function AdminDashboardContent({
  initialOrders,
  initialOrdersError,
  initialProducts,
  initialProductsError,
  initialCategories,
  initialCategoriesError,
}: AdminDashboardContentProps) {
  const [orders, setOrders] = useState<AdminOrderListItem[]>(initialOrders);
  const [products, setProducts] = useState<AdminProductListItem[]>(initialProducts);
  const [categories, setCategories] = useState<AdminCategoryListItem[]>(initialCategories);

  const [ordersError] = useState<string | null>(initialOrdersError);
  const [productsError] = useState<string | null>(initialProductsError);
  const [categoriesError] = useState<string | null>(initialCategoriesError);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<AdminOrderDetail | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("orders");
  const [modeTab, setModeTab] = useState<"dine_in" | "takeaway">("dine_in");

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isUpdatingOrder, setIsUpdatingOrder] = useState<Record<string, boolean>>({});
  const [isTogglingProduct, setIsTogglingProduct] = useState<Record<string, boolean>>({});
  const [isEditingCategory, setIsEditingCategory] = useState<Record<string, boolean>>({});
  const [isArchivingCategory, setIsArchivingCategory] = useState<Record<string, boolean>>({});
  const [isDeletingCategory, setIsDeletingCategory] = useState<Record<string, boolean>>({});
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Product Form state
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productFormMode, setProductFormMode] = useState<"create" | "edit">("create");
  const [editingProduct, setEditingProduct] = useState<AdminProductListItem | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState<Record<string, boolean>>({});
  const [isArchivingProduct, setIsArchivingProduct] = useState<Record<string, boolean>>({});
  const [isDeletingProduct, setIsDeletingProduct] = useState<Record<string, boolean>>({});

  const { success, error: showError, info } = useToast();

  // Category Form state
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryFormMode, setCategoryFormMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<AdminCategoryListItem | null>(null);

  const isOrderDetailOpen = selectedOrderId !== null;

  // Suscripción Realtime a cambios en pedidos
  const { connectionStatus, newOrdersCount, newOrdersByMode, newOrderIdsByMode, markOrdersAsSeen } = useAdminOrdersRealtime({
    orders,
    setOrders,
    selectedOrderId,
    setOrderDetail,
    isOrderDetailOpen,
  });

  // Suscripción Realtime a cambios en categorías y productos (contadores)
  const { connectionStatus: categoriesConnectionStatus } = useAdminCategoriesRealtime({
    categories,
    setCategories,
  });

  // Toast notificaciones contextuales para nuevos pedidos por modo
  const prevNewOrdersByModeRef = useRef<{ dine_in: number; takeaway: number }>({ dine_in: 0, takeaway: 0 });
  useEffect(() => {
    const prev = prevNewOrdersByModeRef.current;
    if (newOrdersByMode.dine_in > prev.dine_in) {
      const count = newOrdersByMode.dine_in - prev.dine_in;
      info(`Nuevo pedido${count !== 1 ? "s" : ""} — En el local (${count})`);
    }
    if (newOrdersByMode.takeaway > prev.takeaway) {
      const count = newOrdersByMode.takeaway - prev.takeaway;
      info(`Nuevo pedido${count !== 1 ? "s" : ""} — Delivery (${count})`);
    }
    prevNewOrdersByModeRef.current = newOrdersByMode;
  }, [newOrdersByMode, info]);

  // Marcar como vistos cuando el usuario interactúa con la lista o entra al panel
  const handleOrdersListInteraction = useCallback(() => {
    if (newOrdersCount > 0) {
      markOrdersAsSeen();
    }
  }, [newOrdersCount, markOrdersAsSeen]);

  // También marcar como vistos al abrir/cerrar el modal de detalle
  useEffect(() => {
    if (isOrderDetailOpen && newOrdersCount > 0) {
      markOrdersAsSeen();
    }
  }, [isOrderDetailOpen, newOrdersCount, markOrdersAsSeen]);

  const handleViewDetail = useCallback(async (orderId: string) => {
    setSelectedOrderId(orderId);
    setOrderDetail(null);
    setIsLoadingDetail(true);

    const result = await getAdminOrderDetail(orderId);

    if (result.ok) {
      setOrderDetail(result.data);
    } else {
      showError(result.message);
      setSelectedOrderId(null);
    }
    setIsLoadingDetail(false);
  }, [showError]);

  const handleCloseDetail = useCallback(() => {
    setSelectedOrderId(null);
    setOrderDetail(null);
  }, []);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: "preparing" | "ready") => {
    const currentOrder = orders.find((o) => o.id === orderId);
    const expectedStatus = currentOrder?.status;

    setIsUpdatingOrder((prev) => ({ ...prev, [orderId]: true }));

    try {
      const result = await updateOrderStatus({ orderId, newStatus, expectedStatus });

      if (result.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: result.data.status, updated_at: result.data.updated_at } : o
          )
        );
        if (orderDetail?.id === orderId) {
          setOrderDetail((prev) => (prev ? { ...prev, status: result.data.status, updated_at: result.data.updated_at } : null));
        }

        const statusLabel = newStatus === "preparing" ? "Preparando" : "Listo";
        success(`Pedido movido a ${statusLabel}`);
      } else if (result.code === "CONFLICT") {
        showError(result.message);
        const listResult = await listAdminOrders();
        if (listResult.ok) {
          setOrders(listResult.data);
        }
      } else {
        showError(result.message);
      }
    } catch {
      showError("No se pudo actualizar el pedido. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setIsUpdatingOrder((prev) => ({ ...prev, [orderId]: false }));
    }
  }, [orders, orderDetail, showError, success]);

  const handleToggleProduct = useCallback(async (productId: string, isAvailable: boolean) => {
    const currentProduct = products.find((p) => p.id === productId);
    const expectedAvailable = currentProduct?.is_available;

    setIsTogglingProduct((prev) => ({ ...prev, [productId]: true }));

    const result = await toggleProductAvailability({ productId, isAvailable, expectedAvailable });

    setIsTogglingProduct((prev) => ({ ...prev, [productId]: false }));

    if (result.ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, is_available: result.data.is_available, updated_at: result.data.updated_at } : p
        )
      );
      success(result.data.is_available ? "Producto habilitado" : "Producto deshabilitado");
    } else if (result.code === "CONFLICT") {
      showError(result.message);
      const listResult = await listAdminProducts();
      if (listResult.ok) {
        setProducts(listResult.data);
      }
    } else {
      showError(result.message);
    }
  }, [products, showError, success]);

  // ─── Categories Handlers ───

  const handleOpenCreateCategory = useCallback(() => {
    setEditingCategory(null);
    setCategoryFormMode("create");
    setCategoryFormOpen(true);
  }, []);

  const handleEditCategory = useCallback((category: AdminCategoryListItem) => {
    setEditingCategory(category);
    setCategoryFormMode("edit");
    setCategoryFormOpen(true);
  }, []);

  const handleCloseCategoryForm = useCallback(() => {
    setCategoryFormOpen(false);
    setEditingCategory(null);
  }, []);

  const handleCreateCategory = useCallback(async (data: CreateCategoryInput) => {
    setIsCreatingCategory(true);
    try {
      const result = await createCategory(data);
      if (!result.ok) {
        throw new Error(result.message);
      }
      // Refresh categories list
      const listResult = await listAdminCategories();
      if (listResult.ok) {
        setCategories(listResult.data);
      }
    } finally {
      setIsCreatingCategory(false);
    }
  }, []);

  const handleUpdateCategory = useCallback(async (data: UpdateCategoryInput, expectedUpdatedAt?: string) => {
    const catId = data.id;
    setIsEditingCategory((prev) => ({ ...prev, [catId]: true }));
    try {
      const result = await updateCategory({ ...data, expectedUpdatedAt });
      if (!result.ok) {
        if (result.code === "CONFLICT") {
          // Conflict: another admin modified the category. Refresh from server.
          showError(result.message);
          const listResult = await listAdminCategories();
          if (listResult.ok) {
            setCategories(listResult.data);
          }
          return;
        }
        throw new Error(result.message);
      }
      // Update local state with new updated_at
      setCategories((prev) =>
        prev.map((c) =>
          c.id === catId ? { ...c, updated_at: result.data.updated_at, ...data } : c
        )
      );
      // Note: we don't spread all data because some fields might not be in AdminCategoryListItem
      // The refresh above handles it, but we optimistically update updated_at
      success("Categoría actualizada correctamente");
} finally {
      setIsArchivingCategory((prev) => ({ ...prev, [catId]: false }));
    }
  }, [showError, success]);

  const handleDeleteCategory = useCallback(async (category: AdminCategoryListItem) => {
    const catId = category.id;
    const expectedUpdatedAt = category.updated_at;

    // Confirmation
    const confirmMessage = `Eliminar "${category.label}" la eliminará PERMANENTEMENTE. Esta acción no se puede deshacer. ¿Continuar?`;

    if (!confirm(confirmMessage)) return;

    setIsDeletingCategory((prev) => ({ ...prev, [catId]: true }));
    try {
      const result = await deleteCategory({ id: catId, expectedUpdatedAt } as DeleteCategoryInput);
      if (!result.ok) {
        if (result.code === "CONFLICT") {
          showError(result.message);
          const listResult = await listAdminCategories();
          if (listResult.ok) {
            setCategories(listResult.data);
          }
          return;
        }
        if (result.code === "HAS_PRODUCTS") {
          showError(result.message);
          return;
        }
        throw new Error(result.message);
      }
      // Remove from local state
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      // Close form if open for this category
      if (editingCategory?.id === catId) {
        setCategoryFormOpen(false);
        setEditingCategory(null);
      }
      success("Categoría eliminada permanentemente");
    } finally {
      setIsDeletingCategory((prev) => ({ ...prev, [catId]: false }));
    }
  }, [editingCategory, showError, success]);

  const handleArchiveCategory = useCallback(async (category: AdminCategoryListItem) => {
    const catId = category.id;
    const expectedUpdatedAt = category.updated_at;

    // Show confirmation
    const hasProducts = category.products_count > 0;
    const actionLabel = category.featured ? "Quitar destacada" : "Destacar";
    const confirmMessage = hasProducts
      ? `${actionLabel} esta categoría no elimina ni oculta sus ${category.products_count} producto${category.products_count !== 1 ? "s" : ""} del catálogo público. ¿Continuar?`
      : `¿${actionLabel} esta categoría?`;

    if (!confirm(confirmMessage)) return;

    setIsArchivingCategory((prev) => ({ ...prev, [catId]: true }));
    try {
      const result = await archiveCategory({ id: catId, expectedUpdatedAt } as ArchiveCategoryInput);
      if (!result.ok) {
        if (result.code === "CONFLICT") {
          showError(result.message);
          const listResult = await listAdminCategories();
          if (listResult.ok) {
            setCategories(listResult.data);
          }
          return;
        }
        throw new Error(result.message);
      }
      // Update local state
      setCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? { ...c, featured: result.data.featured, updated_at: result.data.updated_at }
            : c
        )
      );
      success(result.data.featured ? "Categoría destacada" : "Categoría quitada de destacadas");
    } finally {
      setIsArchivingCategory((prev) => ({ ...prev, [catId]: false }));
    }
  }, [showError, success]);

  const handleToggleFeatured = useCallback(async (category: AdminCategoryListItem) => {
    const catId = category.id;
    const expectedUpdatedAt = category.updated_at;
    const newFeatured = !category.featured;

    // No confirmation needed for toggle - it's a reversible action
    // But we can show a brief confirmation for safety
    const actionLabel = newFeatured ? "Destacar" : "Quitar destacada";
    const confirmMessage = `¿${actionLabel} la categoría "${category.label}"?`;

    if (!confirm(confirmMessage)) return;

    setIsArchivingCategory((prev) => ({ ...prev, [catId]: true }));
    try {
      const result = await updateCategory({
        id: catId,
        featured: newFeatured,
        expectedUpdatedAt,
      } as UpdateCategoryInput);
      if (!result.ok) {
        if (result.code === "CONFLICT") {
          showError(result.message);
          const listResult = await listAdminCategories();
          if (listResult.ok) {
            setCategories(listResult.data);
          }
          return;
        }
        throw new Error(result.message);
      }
      // Update local state
      setCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? { ...c, featured: result.data.featured, updated_at: result.data.updated_at }
            : c
        )
      );
      success(newFeatured ? "Categoría destacada" : "Categoría quitada de destacadas");
    } finally {
      setIsArchivingCategory((prev) => ({ ...prev, [catId]: false }));
    }
  }, [showError, success]);

  const handleReorderCategories = useCallback(async (newOrder: Array<{ id: string; sort_order: number }>) => {
    // Optimistic local update: apply the new order immediately.
    const orderMap = new Map(newOrder.map((c) => [c.id, c.sort_order]));
    setCategories((prev) =>
      prev
        .map((c) => ({ ...c, sort_order: orderMap.get(c.id) ?? c.sort_order }))
        .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
    );

    const result = await reorderCategories({ categories: newOrder });
    if (!result.ok) {
      // Rollback: restore server truth (the realtime hook may also refresh).
      const listResult = await listAdminCategories();
      if (listResult.ok) {
        setCategories(listResult.data);
      }
      if (result.code === "CONFLICT") {
        showError(result.message);
        return;
      }
      throw new Error(result.message);
    }
    success("Orden de categorías actualizado");
  }, [showError, success]);

  const handleCategoryFormSubmit = useCallback(
    async (data: CreateCategoryInput | UpdateCategoryInput, expectedUpdatedAt?: string) => {
      if (categoryFormMode === "create") {
        await handleCreateCategory(data as CreateCategoryInput);
      } else {
        await handleUpdateCategory(data as UpdateCategoryInput, expectedUpdatedAt);
      }
    },
    [categoryFormMode, handleCreateCategory, handleUpdateCategory]
  );

  // ─── Products Handlers ───

  const handleOpenCreateProduct = useCallback(() => {
    setEditingProduct(null);
    setProductFormMode("create");
    setProductFormOpen(true);
  }, []);

  const handleEditProduct = useCallback((product: AdminProductListItem) => {
    // Strip category_label (UI-only field) - not part of ProductFormData or updateProduct schema
    const { category_label, ...formData } = product;
    setEditingProduct(formData as AdminProductListItem);
    setProductFormMode("edit");
    setProductFormOpen(true);
  }, []);

  const handleCloseProductForm = useCallback(() => {
    setProductFormOpen(false);
    setEditingProduct(null);
  }, []);

  const handleCreateProduct = useCallback(async (data: CreateProductInput) => {
    setIsCreatingProduct(true);
    try {
      const result = await createProduct(data);
      if (!result.ok) {
        throw new Error(result.message);
      }
      // Refresh products list
      const listResult = await listAdminProducts();
      if (listResult.ok) {
        setProducts(listResult.data);
      }
    } finally {
      setIsCreatingProduct(false);
    }
  }, []);

  const handleUpdateProduct = useCallback(async (data: UpdateProductInput, expectedUpdatedAt?: string) => {
    const prodId = data.id;
    setIsEditingProduct((prev) => ({ ...prev, [prodId]: true }));
    try {
      const result = await updateProduct({ ...data, expectedUpdatedAt });
      if (!result.ok) {
        if (result.code === "CONFLICT") {
          // Conflict: another admin modified the product. Refresh from server.
          showError(result.message);
          const listResult = await listAdminProducts();
          if (listResult.ok) {
            setProducts(listResult.data);
          }
          throw new Error(result.message); // Ensure form stays open and pending resets
        }
        throw new Error(result.message);
      }
      // Update local state with new updated_at
      setProducts((prev) =>
        prev.map((p) =>
          p.id === prodId ? { ...p, updated_at: result.data.updated_at, ...data } : p
        )
      );
      // Toast de éxito lo maneja ProductForm para no duplicar
    } finally {
      setIsEditingProduct((prev) => ({ ...prev, [prodId]: false }));
    }
  }, [showError, success]);

  const handleArchiveProduct = useCallback(async (product: AdminProductListItem) => {
    const prodId = product.id;
    const expectedUpdatedAt = product.updated_at;

    // Show confirmation
    const confirmMessage = `Desactivar "${product.name}" lo quitará del catálogo público. Los pedidos históricos no se ven afectados. ¿Continuar?`;

    if (!confirm(confirmMessage)) return;

    setIsArchivingProduct((prev) => ({ ...prev, [prodId]: true }));
    try {
      const result = await archiveProduct({ id: prodId, expectedUpdatedAt } as ArchiveProductInput);
      if (!result.ok) {
        if (result.code === "CONFLICT") {
          showError(result.message);
          const listResult = await listAdminProducts();
          if (listResult.ok) {
            setProducts(listResult.data);
          }
          return;
        }
        throw new Error(result.message);
      }
      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === prodId
            ? { ...p, is_available: result.data.is_available, updated_at: result.data.updated_at }
            : p
        )
      );
      success("Producto desactivado");
    } finally {
      setIsArchivingProduct((prev) => ({ ...prev, [prodId]: false }));
    }
  }, [showError, success]);

  const handleDeleteProduct = useCallback(async (product: AdminProductListItem) => {
    const prodId = product.id;
    const expectedUpdatedAt = product.updated_at;

    // Show confirmation
    const confirmMessage = `Eliminar "${product.name}" lo borrará PERMANENTEMENTE. Esta acción no se puede deshacer. Los pedidos históricos conservan sus snapshots. ¿Continuar?`;

    if (!confirm(confirmMessage)) return;

    setIsDeletingProduct((prev) => ({ ...prev, [prodId]: true }));
    try {
      const result = await deleteProduct({ id: prodId, expectedUpdatedAt } as DeleteProductInput);
      if (!result.ok) {
        if (result.code === "CONFLICT") {
          showError(result.message);
          const listResult = await listAdminProducts();
          if (listResult.ok) {
            setProducts(listResult.data);
          }
          return;
        }
        if (result.code === "HAS_ORDERS") {
          showError(result.message);
          return;
        }
        throw new Error(result.message);
      }
      // Remove from local state
      setProducts((prev) => prev.filter((p) => p.id !== prodId));
      // Close form if open for this product
      if (editingProduct?.id === prodId) {
        setProductFormOpen(false);
        setEditingProduct(null);
      }
      success("Producto eliminado permanentemente");
    } finally {
      setIsDeletingProduct((prev) => ({ ...prev, [prodId]: false }));
    }
  }, [editingProduct, showError, success]);

  const handleProductFormSubmit = useCallback(
    async (data: CreateProductInput | UpdateProductInput, expectedUpdatedAt?: string) => {
      if (productFormMode === "create") {
        await handleCreateProduct(data as CreateProductInput);
      } else {
        await handleUpdateProduct(data as UpdateProductInput, expectedUpdatedAt);
      }
    },
    [productFormMode, handleCreateProduct, handleUpdateProduct]
  );

  return (
    <>
      {/* Connection Status Indicator */}
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg bg-ink-soft/95 border px-3 py-2 shadow-lg backdrop-blur-sm">
        {CONNECTION_STATUS_ICONS[connectionStatus]}
        <span className={`text-xs font-medium ${CONNECTION_STATUS_COLORS[connectionStatus]}`}>
          {CONNECTION_STATUS_LABELS[connectionStatus]}
        </span>
        {connectionStatus === "error" && (
          <span className="text-xs text-cream-dim">(Reintentando…)</span>
        )}
      </div>

      {/* New Orders Counter — contextual por modo */}
      {(newOrdersByMode.dine_in > 0 || newOrdersByMode.takeaway > 0) && (
        <button
          type="button"
          onClick={handleOrdersListInteraction}
          className="fixed bottom-16 left-4 z-40 flex flex-col gap-1 rounded-lg bg-brand px-3 py-2 shadow-lg animate-in slide-in-from-bottom-4 duration-200"
          aria-label={`${newOrdersByMode.dine_in} pedido${newOrdersByMode.dine_in !== 1 ? "s" : ""} en el local, ${newOrdersByMode.takeaway} pedido${newOrdersByMode.takeaway !== 1 ? "s" : ""} delivery nuevos`}
        >
          {newOrdersByMode.dine_in > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Utensils className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{newOrdersByMode.dine_in} nuevo{newOrdersByMode.dine_in !== 1 ? "s" : ""} — En el local</span>
            </span>
          )}
          {newOrdersByMode.takeaway > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{newOrdersByMode.takeaway} nuevo{newOrdersByMode.takeaway !== 1 ? "s" : ""} — Delivery</span>
            </span>
          )}
        </button>
      )}

      <div className="space-y-6">
        {/* Section Navigation Tabs */}
        <nav className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Secciones del panel admin">
          {(
            [
              { id: "orders", label: "Pedidos", icon: SECTION_ICONS.orders, hasNew: newOrdersCount > 0, newCount: newOrdersCount },
              { id: "products", label: "Productos", icon: SECTION_ICONS.products, hasNew: false, newCount: 0 },
              { id: "categories", label: "Categorías", icon: SECTION_ICONS.categories, hasNew: false, newCount: 0 },
            ] as const
          ).map((section) => (
            <button
              key={section.id}
              role="tab"
              aria-selected={activeSection === section.id}
              onClick={() => setActiveSection(section.id as Section)}
              className={`flex-shrink-0 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand/60 ${
                activeSection === section.id
                  ? "bg-brand text-ink border border-brand/40"
                  : "bg-ink-soft/40 text-cream border border-line/30 hover:bg-ink/50 hover:border-brand/40"
              }`}
            >
              {section.icon}
              {section.label}
              {section.hasNew && section.id === "orders" && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-amber-500 text-xs font-medium text-ink animate-pulse px-1.5">
                  {section.newCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Section Content */}
        {activeSection === "orders" && (
          <AdminOrdersList
            orders={orders}
            isLoading={false}
            error={ordersError}
            onViewDetail={handleViewDetail}
            onStatusChange={handleStatusChange}
            isUpdating={isUpdatingOrder}
            newOrderIds={modeTab === "dine_in" ? newOrderIdsByMode.dine_in : newOrderIdsByMode.takeaway}
            modeTab={modeTab}
            onModeTabChange={setModeTab}
            onListInteraction={handleOrdersListInteraction}
          />
        )}

        {activeSection === "products" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="font-display text-xl uppercase tracking-tight text-cream flex items-center gap-2">
                {SECTION_ICONS.products}
                Productos
              </h2>
              <button
                type="button"
                onClick={handleOpenCreateProduct}
                disabled={isCreatingProduct}
                className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:bg-brand-bright focus:outline-none focus:ring-2 focus:ring-brand/60 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-busy={isCreatingProduct ? "true" : "false"}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {isCreatingProduct ? "Creando…" : "Nuevo producto"}
              </button>
            </div>

            <AdminProductsList
              products={products}
              isLoading={false}
              error={productsError}
              onToggle={handleToggleProduct}
              onEdit={handleEditProduct}
              onArchive={handleArchiveProduct}
              onDelete={handleDeleteProduct}
              isToggling={isTogglingProduct}
              isEditing={isEditingProduct}
              isArchiving={isArchivingProduct}
              isDeleting={isDeletingProduct}
            />
          </>
        )}

        {activeSection === "categories" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="font-display text-xl uppercase tracking-tight text-cream flex items-center gap-2">
                {SECTION_ICONS.categories}
                Categorías
              </h2>
              <button
                type="button"
                onClick={handleOpenCreateCategory}
                disabled={isCreatingCategory}
                className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-ink transition hover:bg-brand-bright focus:outline-none focus:ring-2 focus:ring-brand/60 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-busy={isCreatingCategory ? "true" : "false"}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {isCreatingCategory ? "Creando…" : "Nueva categoría"}
              </button>
            </div>

            <AdminCategoriesList
              categories={categories}
              isLoading={false}
              error={categoriesError}
              onEdit={handleEditCategory}
              onToggleFeatured={handleToggleFeatured}
              onDelete={handleDeleteCategory}
              onReorder={handleReorderCategories}
              isEditing={isEditingCategory}
              isTogglingFeatured={isArchivingCategory}
              isDeleting={isDeletingCategory}
            />
          </>
        )}

        <AdminOrderDetailModal
          order={orderDetail}
          isOpen={selectedOrderId !== null}
          onClose={handleCloseDetail}
          onStatusChange={handleStatusChange}
          isUpdating={isLoadingDetail || (selectedOrderId ? isUpdatingOrder[selectedOrderId] : false)}
        />

        <CategoryForm
          initialData={editingCategory
            ? {
                id: editingCategory.id,
                label: editingCategory.label,
                featured: editingCategory.featured,
                sort_order: editingCategory.sort_order,
                options: editingCategory.options,
              }
            : null}
          isOpen={categoryFormOpen}
          onClose={handleCloseCategoryForm}
          onSubmit={handleCategoryFormSubmit}
          isPending={isCreatingCategory || (editingCategory ? isEditingCategory[editingCategory.id] : false)}
          mode={categoryFormMode}
          expectedUpdatedAt={editingCategory?.updated_at}
        />

        <ProductForm
          initialData={editingProduct}
          categories={categories.map((c) => ({ id: c.id, label: c.label }))}
          isOpen={productFormOpen}
          onClose={handleCloseProductForm}
          onSubmit={handleProductFormSubmit}
          onDelete={editingProduct ? () => handleDeleteProduct(editingProduct) : undefined}
          isPending={isCreatingProduct || (editingProduct ? isEditingProduct[editingProduct.id] : false)}
          isDeleting={editingProduct ? isDeletingProduct[editingProduct.id] : false}
          mode={productFormMode}
          expectedUpdatedAt={editingProduct?.updated_at}
        />
      </div>
    </>
  );
}