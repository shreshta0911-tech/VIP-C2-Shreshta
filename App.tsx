import React, { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  User,
  LayoutDashboard,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  Package,
  LogOut,
  MapPin,
  CreditCard,
  MessageSquare,
  Star,
  Eye,
  Settings,
  ChevronRight,
  ShoppingBag,
  X,
  TrendingUp,
  Sliders,
  Sparkles,
  ArrowLeft,
  Users
} from "lucide-react";
import { apiFetch } from "./utils/api";
import { User as AuthUser, Product, CartItem, Order, AnalyticsData } from "./types";

export default function App() {
  // Navigation & UI State
  const [currentView, setCurrentView] = useState<string>("home"); // home, detail, cart, checkout, order-details, orders, admin

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("auracart_darkMode");
  }, []);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(" "); // Space for state triggers
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("featured");

  // Auth States
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authModal, setAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState<string>("");

  // Product Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // checkout form state
  const [shippingForm, setShippingForm] = useState({
    fullName: "Shreshta",
    street: "123 Maple Street",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    phone: "+1 (555) 0192"
  });
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "paypal" | "cod">("credit_card");
  const [specialRequirements, setSpecialRequirements] = useState<string>("");
  const [orderConfirmId, setOrderConfirmId] = useState<string | null>(null);

  // User orders
  const [userOrders, setUserOrders] = useState<Order[]>([]);

  // Admin states
  const [adminAnalytics, setAdminAnalytics] = useState<AnalyticsData | null>(null);
  const [adminActiveTab, setAdminActiveTab] = useState<"analytics" | "products" | "orders" | "customers">("analytics");
  const [productForm, setProductForm] = useState<Partial<Product> | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);

  // Review Form state
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewError, setReviewError] = useState<string>("");

  // Global Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Bootstrapping: Try to load active user and load catalog
  useEffect(() => {
    setSearchQuery(""); // clean start
    fetchProducts();
    const token = localStorage.getItem("nexcart_token");
    if (token) {
      apiFetch<{ user: AuthUser }>("/api/auth/me")
        .then((res) => {
          setUser(res.user);
          fetchCart(res.user.id);
          fetchOrders();
        })
        .catch(() => {
          localStorage.removeItem("nexcart_token");
        });
    }
  }, []);

  // Sync state triggers
  useEffect(() => {
    if (user) {
      fetchCart(user.id);
      fetchOrders();
      if (user.role === "admin") {
        fetchAdminData();
      }
    } else {
      setCartItems([]);
      setUserOrders([]);
    }
  }, [user]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await apiFetch<Product[]>("/api/products");
      setProducts(res);
    } catch (err: any) {
      showToast(err.message || "Failed to load products", "error");
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCart = async (userId: string) => {
    try {
      const res = await apiFetch<{ items: CartItem[] }>(`/api/cart/${userId}`);
      setCartItems(res.items);
    } catch (_) {
      // safe fallback
    }
  };

  const syncCartWithServer = async (updatedItems: CartItem[]) => {
    if (!user) return;
    try {
      const payload = updatedItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity
      }));
      await apiFetch(`/api/cart/${user.id}`, {
        method: "POST",
        body: JSON.stringify({ items: payload })
      });
    } catch (err: any) {
      showToast(err.message || "Failed to sync cart", "error");
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiFetch<Order[]>("/api/orders");
      setUserOrders(res);
    } catch (_) {}
  };

  const fetchAdminData = async () => {
    try {
      const analytics = await apiFetch<AnalyticsData>("/api/admin/analytics");
      setAdminAnalytics(analytics);
      const users = await apiFetch<AuthUser[]>("/api/auth/users");
      setAllUsers(users);
    } catch (_) {}
  };

  // Authenticators
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = authMode === "login" 
        ? { email: authForm.email, password: authForm.password }
        : authForm;

      const res = await apiFetch<{ user: AuthUser; token: string }>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      localStorage.setItem("nexcart_token", res.token);
      setUser(res.user);
      setAuthModal(false);
      setAuthForm({ name: "", email: "", password: "" });
      showToast(`Welcome back, ${res.user.name}!`);
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("nexcart_token");
    setUser(null);
    setCurrentView("home");
    showToast("Logged out successfully");
  };

  // Cart operations
  const addToCart = (product: Product, quantity = 1, silent = false) => {
    if (!user) {
      setAuthMode("login");
      setAuthModal(true);
      showToast("Please authenticate to secure items in your cart", "error");
      return;
    }

    if (product.inventory <= 0) {
      showToast("Item is currently out of stock", "error");
      return;
    }

    const existingIndex = cartItems.findIndex((item) => item.product.id === product.id);
    let newItems = [...cartItems];

    if (existingIndex > -1) {
      const totalWanted = newItems[existingIndex].quantity + quantity;
      if (totalWanted > product.inventory) {
        showToast(`Only ${product.inventory} items are available in stock.`, "error");
        return;
      }
      newItems[existingIndex].quantity = totalWanted;
    } else {
      newItems.push({ product, quantity });
    }

    setCartItems(newItems);
    syncCartWithServer(newItems);
    if (!silent) {
      showToast(`${product.name} added to cart`);
    }
  };

  const updateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cartItems.find((i) => i.product.id === productId);
    if (item && quantity > item.product.inventory) {
      showToast(`Sorry, only ${item.product.inventory} units are in stock.`, "error");
      return;
    }

    const newItems = cartItems.map((i) =>
      i.product.id === productId ? { ...i, quantity } : i
    );
    setCartItems(newItems);
    syncCartWithServer(newItems);
  };

  const removeFromCart = (productId: string) => {
    const newItems = cartItems.filter((i) => i.product.id !== productId);
    setCartItems(newItems);
    syncCartWithServer(newItems);
    showToast("Item removed from cart");
  };

  // Unified review poster
  const postReview = async (productId: string) => {
    setReviewError("");
    if (!reviewComment.trim()) {
      setReviewError("Please type a product review");
      return;
    }

    try {
      const resProduct = await apiFetch<Product>(`/api/products/${productId}/review`, {
        method: "POST",
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
          username: user ? user.name : "Anonymous Shopper"
        })
      });

      // Update in products lists
      setProducts(products.map((p) => (p.id === productId ? resProduct : p)));
      setSelectedProduct(resProduct);
      setReviewComment("");
      setReviewRating(5);
      showToast("Review submitted successfully. Thank you!");
    } catch (err: any) {
      setReviewError(err.message || "Failed to submit review");
    }
  };

  // Immediate purchasing option ('Shop Now' design guideline)
  const initiateShopNow = (product: Product) => {
    if (!user) {
      setAuthMode("login");
      setAuthModal(true);
      showToast("Sign in to complete your purchase instantly");
      return;
    }

    if (product.inventory <= 0) {
      showToast("Sorry, this item is out of stock.", "error");
      return;
    }

    // Set up dedicated temporary single item cart for checkout
    const tempCartItem: CartItem = { product, quantity: 1 };
    setCartItems([tempCartItem]);
    syncCartWithServer([tempCartItem]);
    
    // Open checkout directly
    setCurrentView("checkout");
  };

  // checkout submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      showToast("Your shopping cart is empty", "error");
      return;
    }

    try {
      const orderPayload = {
        userId: user?.id,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        shippingAddress: shippingForm,
        paymentMethod,
        requirements: specialRequirements
      };

      const completedOrder = await apiFetch<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify(orderPayload)
      });

      setOrderConfirmId(completedOrder.id);
      setSelectedOrder(completedOrder);
      setCartItems([]);
      fetchProducts(); // Refresh stocks list
      setCurrentView("order-details");
      showToast("Congratulations! Your order has been placed securely.");
    } catch (err: any) {
      showToast(err.message || "Failed to finalize order", "error");
    }
  };

  // Admin update Order details
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const updated = await apiFetch<Order>(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
      showToast(`Order #${orderId} status changed to "${status}"`);
      fetchAdminData();
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || "Failed to change order status", "error");
    }
  };

  // Admin modify products
  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm?.name || !productForm?.category || productForm?.price === undefined || productForm?.inventory === undefined) {
      showToast("Please fill in all core fields", "error");
      return;
    }

    try {
      let result;
      if (editingProductId) {
        result = await apiFetch<Product>(`/api/products/${editingProductId}`, {
          method: "PUT",
          body: JSON.stringify(productForm)
        });
        showToast("Product updated successfully");
      } else {
        result = await apiFetch<Product>("/api/products", {
          method: "POST",
          body: JSON.stringify(productForm)
        });
        showToast("New product listed successfully");
      }

      setProductForm(null);
      setEditingProductId(null);
      fetchProducts();
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || "Failed to save product specification", "error");
    }
  };

  const startEditProduct = (prod: Product) => {
    setProductForm({ ...prod });
    setEditingProductId(prod.id);
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to pull this product from the listing?")) return;
    try {
      await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      showToast("Product deleted successfully");
      fetchProducts();
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete product", "error");
    }
  };

  const getSubtotal = () => {
    return cartItems.reduce((acc, curr) => {
      const activePrice = Number((curr.product.price * (1 - curr.product.discount / 100)).toFixed(2));
      return acc + activePrice * curr.quantity;
    }, 0);
  };

  // Filters logic
  const filteredProducts = products.filter((prod) => {
    const term = searchQuery.toLowerCase().trim();
    const matchesSearch = term === "" || 
      prod.name.toLowerCase().includes(term) ||
      prod.category.toLowerCase().includes(term) ||
      prod.description.toLowerCase().includes(term);

    const matchesCategory = categoryFilter === "All" || prod.category === categoryFilter;

    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    const discountedPrice = (p: Product) => p.price * (1 - p.discount / 100);
    if (sortBy === "price-low") return discountedPrice(a) - discountedPrice(b);
    if (sortBy === "price-high") return discountedPrice(b) - discountedPrice(a);
    if (sortBy === "discount") return b.discount - a.discount;
    return 0; // Default Featured
  });

  const uniqueCategories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased font-sans">
      
      {/* Dynamic Notification Toast */}
      {toast && (
        <div id="nexcart-toast" className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 transition-all duration-300 transform translate-y-0 ${
          toast.type === "success" ? "bg-slate-900 text-white border-l-4 border-emerald-500" : "bg-rose-900 text-white border-l-4 border-red-500"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <X className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Primary Global Navigation Header */}
      <header id="main-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo Section */}
          <div className="flex items-center gap-8">
            <button id="logo-button" onClick={() => { setCurrentView("home"); setSelectedProduct(null); }} className="flex items-center gap-3 hover:opacity-90 active:scale-95 transition-all text-left">
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-600/20">
                NC
              </div>
              <div>
                <span className="text-xl font-black text-slate-900 tracking-tight block">NexCart</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">Marketplace</span>
              </div>
            </button>

            {/* Quick Categories Bar (Desktop View) */}
            <nav className="hidden lg:flex items-center gap-2 text-sm font-medium">
              {uniqueCategories.slice(0, 5).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(cat);
                    setCurrentView("home");
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    categoryFilter === cat 
                      ? "bg-slate-100 text-indigo-600 font-semibold dark:bg-slate-800 dark:text-indigo-400" 
                      : "text-slate-600 hover:text-slate-950 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </nav>
          </div>

          {/* Search Box - Only visible in Storefront views */}
          {currentView !== "admin" && (
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Query products, categories, specs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500 transition-all text-slate-800"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Account & Checkout Tools */}
          <div className="flex items-center gap-4">

            {/* Storefront / Admin Workspace Switcher */}
            {user?.role === "admin" && (
              <button
                id="toggle-panel-btn"
                onClick={() => setCurrentView(currentView === "admin" ? "home" : "admin")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm border transition-all ${
                  currentView === "admin"
                    ? "bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                }`}
              >
                {currentView === "admin" ? (
                  <>
                    <ShoppingBag className="w-4 h-4 text-indigo-600" />
                    <span>Go to Storefront</span>
                  </>
                ) : (
                  <>
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Seller Dashboard</span>
                  </>
                )}
              </button>
            )}

            {/* Shopping Cart Trigger */}
            {currentView !== "admin" && (
              <button
                id="cart-trigger-btn"
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <ShoppingCart className="w-5.5 h-5.5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {cartItems.reduce((acc, curr) => acc + curr.quantity, 0)}
                  </span>
                )}
              </button>
            )}

            {/* User Account Controls */}
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  id="profile-badge-btn"
                  onClick={() => setCurrentView("orders")}
                  className="flex items-center gap-2.5 pl-2.5 pr-4 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                    {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
                  </div>
                </button>
                <button
                  id="logout-button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                id="login-trigger-btn"
                onClick={() => { setAuthMode("login"); setAuthModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 active:scale-95 transition-all shadow-md shadow-slate-900/10"
              >
                <User className="w-4 h-4" />
                <span>Join NexCart</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SUB-HEADER SEARCH PANEL (ONLY MOBILE) */}
      {currentView !== "admin" && (
        <div className="block md:hidden bg-white border-b border-slate-200 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Query catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN VIEW CONTROLLER */}
      <main className="flex-1">

        {/* 1. STOREFRONT CATALOG VIEW */}
        {currentView === "home" && (
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              
              {/* Promo Interactive Hero Banner */}
              <div className="relative bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-800 rounded-3xl overflow-hidden shadow-2xl p-8 sm:p-12 text-white">
                <div className="absolute top-0 right-0 p-8 text-9xl opacity-10 select-none hidden lg:block transform translate-x-12 -translate-y-12">
                  🛍️
                </div>
                <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-45"></div>

                <div className="relative z-10 max-w-xl space-y-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wider uppercase text-indigo-100">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                    Summer Promotion Live
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-heading leading-tight leading-none text-white">
                    Upgrade Your Setup. Effortlessly.
                  </h1>
                  <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
                    Slashed prices up to <strong className="text-white text-lg underline underline-offset-4 decoration-yellow-400 font-black">40% OFF</strong> on all elite wearables, workspace gadgets, and high-fidelity smart home systems. Secure your checkout today.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-4">
                    <button
                      onClick={() => {
                        const topOffer = products.find(p => p.discount >= 15);
                        if(topOffer) {
                          setSelectedProduct(topOffer);
                          setCurrentView("detail");
                        }
                      }}
                      className="px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl shadow-lg shadow-indigo-950/20 hover:bg-indigo-50 transition-all active:scale-95"
                    >
                      Explore Hot Offers
                    </button>
                    <button
                      onClick={() => setCategoryFilter("Smart Home")}
                      className="px-4 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-white font-semibold rounded-xl border border-white/20 transition-all"
                    >
                      Smart Home Deals
                    </button>
                  </div>
                </div>
              </div>

              {/* Filtering, Searching & Sorting UI Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Horizontal Category Selectors */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <span className="text-xs font-bold text-slate-400 capitalize mr-2 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5" />
                    Category:
                  </span>
                  {uniqueCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        categoryFilter === cat
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Sorters and Result counts */}
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
                  <span className="text-xs font-medium text-slate-500">
                    Showing <strong>{filteredProducts.length}</strong> items
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-700"
                  >
                    <option value="featured">Featured Picks</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="discount">Biggest Discounts</option>
                  </select>
                </div>
              </div>

              {/* PRODUCTS GRID CATALOGUE */}
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-sm text-slate-500 font-medium">Fetching best catalog products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔍</div>
                  <h3 className="text-lg font-bold text-slate-900">No matching items found</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">Adjust your search keyword or selection filters and try again.</p>
                  <button onClick={() => { setSearchQuery(""); setCategoryFilter("All"); }} className="mt-4 px-4 py-2 bg-indigo-6 text-white bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 transition" >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((prod) => {
                    const hasDiscount = prod.discount > 0;
                    const finalPrice = (prod.price * (1 - prod.discount / 100)).toFixed(2);
                    const averageRating = prod.reviews.length 
                      ? (prod.reviews.reduce((acc, r) => acc + r.rating, 0) / prod.reviews.length).toFixed(1)
                      : "5.0";

                    return (
                      <div
                        key={prod.id}
                        id={`product-card-${prod.id}`}
                        className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:border-indigo-400 hover:-translate-y-1 relative group"
                      >
                        {/* Discount Sticker */}
                        {hasDiscount && (
                          <span className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] uppercase font-mono font-black tracking-wider px-2.5 py-1 rounded-full z-10 shadow-sm shadow-emerald-500/15">
                            {prod.discount}% OFF
                          </span>
                        )}

                        {/* Stock status bubble */}
                        {prod.inventory <= 5 && (
                          <span className="absolute top-3 right-3 bg-orange-100 text-orange-700 text-[9px] font-bold px-2 py-0.5 rounded-full z-10">
                            {prod.inventory === 0 ? "Out of Stock" : `Hurry, only ${prod.inventory} left!`}
                          </span>
                        )}

                        {/* Image Canvas container */}
                        <div
                          className="aspect-square bg-slate-50 rounded-xl overflow-hidden mb-4 relative flex items-center justify-center cursor-pointer"
                          onClick={() => { setSelectedProduct(prod); setCurrentView("detail"); }}
                        >
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <span className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5">
                              <Eye className="w-4 h-4 text-indigo-600" /> Quick View
                            </span>
                          </div>
                        </div>

                        {/* General details */}
                        <div className="flex-1 space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-indigo-600 uppercase font-bold tracking-widest font-mono">{prod.category}</span>
                              <div className="flex items-center text-amber-500 text-xs font-bold gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-500" />
                                <span>{averageRating}</span>
                                <span className="text-slate-400 font-medium">({prod.reviews.length})</span>
                              </div>
                            </div>

                            <h3
                              onClick={() => { setSelectedProduct(prod); setCurrentView("detail"); }}
                              className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer line-clamp-1 transition-colors mt-1"
                            >
                              {prod.name}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                              {prod.description}
                            </p>
                          </div>

                          {/* Pricing block */}
                          <div className="pt-3 border-t border-slate-100 flex items-baseline gap-2 mt-auto">
                            <span className="text-lg font-black text-slate-900">${finalPrice}</span>
                            {hasDiscount && (
                              <span className="text-xs text-slate-400 line-through">${prod.price.toFixed(2)}</span>
                            )}
                          </div>
                        </div>

                        {/* Card CTA Actions */}
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-2">
                          <button
                            onClick={() => addToCart(prod, 1, false)}
                            disabled={prod.inventory <= 0}
                            className="text-xs font-bold py-2.5 px-3 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add to Cart
                          </button>
                          
                          {/* Mandatory "Shop Now" Direct Purchase Button */}
                          <button
                            onClick={() => initiateShopNow(prod)}
                            disabled={prod.inventory <= 0}
                            className="text-xs font-bold py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-slate-900 text-white shadow-sm shadow-indigo-600/10 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Shop Now
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. PRODUCT DETAILED SCREEN */}
        {currentView === "detail" && selectedProduct && (
          <div className="py-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
              
              {/* Back navigation */}
              <button
                onClick={() => { setCurrentView("home"); setSelectedProduct(null); }}
                className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-bold group transition-colors"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Return to Catalogue</span>
              </button>

              {/* Product Body details splitter */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                
                {/* Media frame */}
                <div className="space-y-4">
                  <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center flex items-center justify-center gap-2">
                    <span className="text-xs font-medium text-indigo-700">✓ Secure sandbox processing with prompt order dispatcher.</span>
                  </div>
                </div>

                {/* Spec writing column */}
                <div className="flex flex-col justify-between space-y-6">
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md">
                        {selectedProduct.category}
                      </span>
                      {selectedProduct.discount > 0 && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-md">
                          Savings: {selectedProduct.discount}%
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3.5xl font-black text-slate-900 font-heading leading-tight">
                      {selectedProduct.name}
                    </h1>

                    {/* Star review badge */}
                    <div className="flex items-center gap-3 border-b border-b-slate-100 pb-4">
                      <div className="flex text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(selectedProduct.reviews.length 
                                ? selectedProduct.reviews.reduce((acc, r) => acc + r.rating, 0) / selectedProduct.reviews.length 
                                : 5) 
                                ? "fill-amber-500" 
                                : "text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        {selectedProduct.reviews.length 
                          ? `${(selectedProduct.reviews.reduce((acc, r) => acc + r.rating, 0) / selectedProduct.reviews.length).toFixed(1)} / 5.0 Rating`
                          : "No ratings yet"}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs text-slate-400">({selectedProduct.reviews.length} reviews)</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">
                          ${(selectedProduct.price * (1 - selectedProduct.discount / 100)).toFixed(2)}
                        </span>
                        {selectedProduct.discount > 0 && (
                          <span className="text-lg text-slate-400 line-through">
                            ${selectedProduct.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">Inclusive of all standard discounts</p>
                    </div>

                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Overview</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {selectedProduct.description}
                      </p>
                    </div>

                    {/* Dynamic Specifications */}
                    {Object.keys(selectedProduct.specifications || {}).length > 0 && (
                      <div className="pt-4 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Specifications & Features</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 border border-slate-100 p-4 rounded-xl">
                          {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                            <div key={key}>
                              <p className="text-slate-400 text-[10px] leading-tight">{key}</p>
                              <p className="font-bold text-slate-800">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Immediate cart controllers */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">Availability:</span>
                      {selectedProduct.inventory > 0 ? (
                        <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                          ● {selectedProduct.inventory} units ready in store
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold">⚠️ Sold Out</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => addToCart(selectedProduct, 1, false)}
                        disabled={selectedProduct.inventory === 0}
                        className="w-full py-3 px-4 font-bold border border-slate-200 text-slate-800 bg-white hover:bg-slate-50 text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <ShoppingCart className="w-4 h-4 text-indigo-600" />
                        <span>Add To Cart</span>
                      </button>
                      <button
                        onClick={() => initiateShopNow(selectedProduct)}
                        disabled={selectedProduct.inventory === 0}
                        className="w-full py-3 px-4 font-bold bg-indigo-600 hover:bg-slate-950 text-white text-sm rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Shop Now (Direct Buy)</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* REVIEW CORNER */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                  <MessageSquare className="w-5.5 h-5.5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">Shopper Feedback ({selectedProduct.reviews.length})</h3>
                </div>

                {/* List past logs */}
                {selectedProduct.reviews.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 italic">No one has reviewed this item yet. Be the first to express your thoughts!</p>
                ) : (
                  <div className="space-y-4 divide-y divide-slate-100">
                    {selectedProduct.reviews.map((rev) => (
                      <div key={rev.id} className="pt-4 first:pt-0 pb-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{rev.username}</span>
                          <span className="text-[10px] text-slate-400 font-medium font-mono">{rev.date}</span>
                        </div>
                        <div className="flex text-amber-500 text-xs gap-0.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star key={idx} className={`w-3 h-3 ${idx < rev.rating ? "fill-amber-500" : "text-slate-200"}`} />
                          ))}
                        </div>
                        <p className="text-sm text-slate-600 font-medium">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Write review form handler */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-6 space-y-4 mt-6">
                  <h4 className="text-sm font-extrabold text-slate-900">Add Feedback for this Product</h4>
                  
                  {reviewError && (
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg text-rose-700 text-xs font-medium">
                      {reviewError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Star Rating</label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((stars) => (
                          <button
                            key={stars}
                            type="button"
                            onClick={() => setReviewRating(stars)}
                            className="p-1 hover:scale-110 active:scale-95 transition-transform"
                          >
                            <Star className={`w-6 h-6 ${stars <= reviewRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your detailed review</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Detail your shopping experience, material weight, colors accuracy..."
                        rows={3}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>

                    <button
                      onClick={() => postReview(selectedProduct.id)}
                      className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-extrabold hover:bg-indigo-600 transition"
                    >
                      Post Review
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* 3. SECURE INTEGRATED CHECKOUT SYSTEM */}
        {currentView === "checkout" && (
          <div className="py-10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 font-heading">Complete Purchase Details</h1>
                  <p className="text-xs text-slate-400">Guaranteed secure transactional sandbox layer.</p>
                </div>
              </div>

              {/* Flex splitter for form and item list */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Product/Cart Summary Sidebar */}
                <div className="lg:col-span-5 rank-2 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight border-b border-slate-100 pb-3">
                      Selected Products ({cartItems.length})
                    </h3>

                    {/* Item list */}
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {cartItems.map((item) => {
                        const finalPrice = (item.product.price * (1 - item.product.discount / 100)).toFixed(2);
                        return (
                          <div key={item.product.id} className="flex gap-3 leading-tight text-xs">
                            <div className="w-14 h-14 bg-slate-50 border border-slate-150 rounded-lg overflow-hidden flex-shrink-0">
                              <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 truncate">{item.product.name}</p>
                              <p className="text-slate-400 text-[10px] mt-0.5 capitalize">{item.product.category}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-slate-500 font-bold">Qty: {item.quantity}</span>
                                <span className="font-bold text-indigo-600">${finalPrice} each</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Calculations summary panel */}
                    <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Items Subtotal:</span>
                        <span className="font-bold">${getSubtotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Federal Dispatch Shipping:</span>
                        <span className="text-emerald-500 font-extrabold font-mono">FREE DEMO</span>
                      </div>
                      <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                        <span className="font-extrabold text-slate-800 text-sm">Amount Due:</span>
                        <span className="font-black text-slate-950 text-xl">${getSubtotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-100 rounded-xl text-center text-[11px] text-slate-400">
                    ⚡ By placing an order, this action updates the database inventories appropriately.
                  </div>
                </div>

                {/* Shipping info and Checkout Form */}
                <form onSubmit={handlePlaceOrder} className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                  
                  {/* Address Section */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l-3 border-indigo-600 pl-2">
                      Fulfillment Shipping Destination
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Receiver's Full Name</label>
                        <input
                          type="text"
                          value={shippingForm.fullName}
                          onChange={(e) => setShippingForm({ ...shippingForm, fullName: e.target.value })}
                          required
                          placeholder="Johnathan Doe"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-slate-400 font-bold mb-1">Street Address</label>
                          <input
                            type="text"
                            value={shippingForm.street}
                            onChange={(e) => setShippingForm({...shippingForm, street: e.target.value})}
                            required
                            placeholder="123 Orchard Suite"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-bold mb-1">Mobile Contact No</label>
                          <input
                            type="text"
                            value={shippingForm.phone}
                            onChange={(e) => setShippingForm({...shippingForm, phone: e.target.value})}
                            required
                            placeholder="+1 (555) 728-1920"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-400 font-bold mb-1">City</label>
                          <input
                            type="text"
                            value={shippingForm.city}
                            onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-bold mb-1">State / Province</label>
                          <input
                            type="text"
                            value={shippingForm.state}
                            onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-bold mb-1">Postal ZIP Code</label>
                          <input
                            type="text"
                            value={shippingForm.zipCode}
                            onChange={(e) => setShippingForm({ ...shippingForm, zipCode: e.target.value })}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Selection Frame */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l-3 border-indigo-600 pl-2">
                      Secure Payment method
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("credit_card")}
                        className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between h-20 transition-all ${
                          paymentMethod === "credit_card" ? "border-indigo-600 bg-indigo-50/40" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <CreditCard className={`w-4 h-4 ${paymentMethod === "credit_card" ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="text-xs font-bold text-slate-900 block mt-2">Credit Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("paypal")}
                        className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between h-20 transition-all ${
                          paymentMethod === "paypal" ? "border-indigo-600 bg-indigo-50/40" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-[10px] font-black tracking-tighter text-indigo-600">PP</span>
                        <span className="text-xs font-bold text-slate-900 block mt-2">PayPal Wallet</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("cod")}
                        className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between h-20 transition-all ${
                          paymentMethod === "cod" ? "border-indigo-600 bg-indigo-50/40" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <MapPin className={`w-4 h-4 ${paymentMethod === "cod" ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="text-xs font-bold text-slate-900 block mt-2">Cash On Delivery</span>
                      </button>
                    </div>
                  </div>

                  {/* Comments Box */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400">Custom Delivery Requirements (Optional)</label>
                    <textarea
                      value={specialRequirements}
                      onChange={(e) => setSpecialRequirements(e.target.value)}
                      placeholder="Ring bell twice, leave packaging near backdoor bin structure, etc."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>

                  {/* Submission dispatch */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentView("home")}
                      className="text-slate-500 hover:text-slate-900 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      className="px-6 py-3 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-600/15"
                    >
                      Authorize & Checkout (${getSubtotal().toFixed(2)})
                    </button>
                  </div>

                </form>

              </div>

            </div>
          </div>
        )}

        {/* 4. TRACKING ORDER DETAILS / CONFIRMATION SCREEN */}
        {currentView === "order-details" && selectedOrder && (
          <div className="py-10">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
                
                {/* Header Success indicator */}
                <div className="text-center space-y-2 py-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 animate-bounce">
                    ✓
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight font-heading">
                    Order Confirmed successfully!
                  </h1>
                  <p className="text-xs text-slate-500">
                    Your unique Tracking reference ID is: <strong className="text-indigo-600 font-mono text-sm">{selectedOrder.id}</strong>
                  </p>
                  <span className="inline-block px-3 py-1 bg-slate-105 border border-slate-200 rounded-full text-[10px] text-slate-400 font-medium">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Status visual workflow tracker line */}
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl max-w-2xl mx-auto">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 right-0 top-3 h-0.5 bg-slate-200 z-0"></div>
                    
                    {/* Visual status states steps */}
                    {["pending", "shipped", "delivered"].map((step, idx) => {
                      const statuses = ["pending", "shipped", "delivered"];
                      const currentIdx = statuses.indexOf(selectedOrder.status);
                      const isCompleted = currentIdx >= idx;
                      const isCurrent = selectedOrder.status === step;

                      return (
                        <div key={step} className="flex flex-col items-center relative z-10">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all ${
                            isCompleted 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                              : "bg-white border-slate-300 text-slate-400"
                          } ${isCurrent ? "ring-4 ring-indigo-100" : ""}`}>
                            {idx + 1}
                          </div>
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold mt-2 ${isCompleted ? "text-indigo-600" : "text-slate-400"}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ordered Items summary details */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchased Summary</h3>
                  
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.productId} className="flex items-center gap-4 text-xs">
                        <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 truncate">{item.name}</h4>
                          <p className="text-slate-400 text-[10px]">Reference: {item.productId}</p>
                        </div>
                        <div className="text-right flex-shrink-0 font-medium text-slate-900">
                          <span>{item.quantity} x ${item.price.toFixed(2)}</span>
                          <p className="font-bold text-indigo-700">${(item.quantity * item.price).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-500">Total charge amount paid:</span>
                    <span className="text-xl font-black text-slate-900 font-mono">${selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Shipper & Delivery Addresses details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-slate-100 pt-6 text-xs">
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-400 uppercase tracking-wider">Destination Shipping Address</h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-1">
                      <p className="font-bold text-slate-800">{selectedOrder.shippingAddress.fullName}</p>
                      <p className="text-slate-600">{selectedOrder.shippingAddress.street}</p>
                      <p className="text-slate-600">{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}, {selectedOrder.shippingAddress.zipCode}</p>
                      <p className="text-slate-400 font-mono mt-2">☎ Phone: {selectedOrder.shippingAddress.phone}</p>
                    </div>
                  </div>

                  <div className="space-y-2 flex flex-col justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-400 uppercase tracking-wider">Special Delivery Instructions</h4>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 min-h-[60px]">
                        <p className="text-slate-600 italic">
                          {selectedOrder.requirements || "No custom delivery specifications provided."}
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                      <span>Method: <strong className="text-slate-800 font-black">{selectedOrder.paymentMethod}</strong></span>
                      <span>Fulfillment Status: <strong className="text-indigo-600 font-black">{selectedOrder.status}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Back to market */}
                <div className="pt-6 border-t border-slate-105 flex justify-center">
                  <button
                    onClick={() => { setCurrentView("home"); setSelectedOrder(null); setOrderConfirmId(null); }}
                    className="px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Continue Shopping Experience
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 5. USER DISPACHED PERSONAL ORDERS */}
        {currentView === "orders" && (
          <div className="py-10">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              
              <div className="flex items-center justify-between border-b border-b-slate-150 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 font-heading">Personal Order Registry</h1>
                  <p className="text-xs text-slate-400">Order verification logs for {user?.name}</p>
                </div>
                <button
                  onClick={() => setCurrentView("home")}
                  className="px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-500 font-semibold text-xs border"
                >
                  Return
                </button>
              </div>

              {userOrders.length === 0 ? (
                <div className="bg-white border rounded-2xl p-10 text-center space-y-4">
                  <p className="text-base text-slate-400 font-medium">You haven't dispatched any orders with us yet.</p>
                  <button onClick={() => setCurrentView("home")} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 transition">
                    Browse All Trending Products
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userOrders.map((ord) => (
                    <div key={ord.id} className="bg-white border border-slate-200 hover:border-slate-350 rounded-2xl p-5 shadow-sm space-y-4 transition-all">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div>
                          <span className="font-extrabold text-slate-500 uppercase tracking-widest text-[10px]">Reference Code</span>
                          <p onClick={() => { setSelectedOrder(ord); setCurrentView("order-details"); }} className="font-mono font-bold text-indigo-700 text-sm hover:underline cursor-pointer">{ord.id}</p>
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-500 uppercase tracking-widest text-[10px]">Date Placed</span>
                          <p className="font-semibold text-slate-700">{new Date(ord.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-500 uppercase tracking-widest text-[10px]">Grand Sum Price</span>
                          <p className="font-black text-slate-900 font-mono">${ord.totalAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-500 uppercase tracking-widest text-[10px]">Transaction Status</span>
                          <p className="mt-0.5">
                            <span className={`px-2.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-full ${
                              ord.status === "delivered" ? "bg-emerald-100 text-emerald-800" :
                              ord.status === "shipped" ? "bg-indigo-100 text-indigo-800" :
                              ord.status === "canceled" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {ord.status}
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={() => { setSelectedOrder(ord); setCurrentView("order-details"); }}
                          className="px-3.5 py-1.5 rounded-lg border hover:bg-slate-50 text-indigo-600 font-bold"
                        >
                          Track Live
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

        {/* 6. ADMIN SELLER WORKSPACE PANEL */}
        {currentView === "admin" && user?.role === "admin" && (
          <div className="flex h-[calc(100vh-4.5rem)] overflow-hidden">
            
            {/* Elegant Sidebar Frame adhering to "Professional Polish" */}
            <div className="w-64 bg-slate-900 text-slate-350 flex flex-col justify-between border-r border-slate-800 flex-shrink-0">
              
              <div className="p-5 space-y-6 overflow-y-auto">
                
                {/* Visual Stats widgets inside drawer */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Seller Insights</h3>
                  <div className="bg-slate-800/60 p-4 border border-slate-700/50 rounded-xl space-y-1">
                    <p className="text-[10px] text-slate-400 capitalize">Gross sales revenue</p>
                    <p className="text-xl font-bold text-white font-mono">${adminAnalytics?.totalRevenue?.toFixed(2) || "0.00"}</p>
                    <p className="text-[9px] text-emerald-400 font-bold mt-1">✓ Live calculations</p>
                  </div>
                  <div className="bg-slate-800/60 p-4 border border-slate-700/50 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400">Listed Ware Catalog</p>
                      <p className="text-lg font-bold text-white font-mono">{adminAnalytics?.totalProducts || 0} items</p>
                    </div>
                    <span className="text-2xl">📦</span>
                  </div>
                </div>

                {/* Segment Controls Navigation */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Navigation</h3>
                  
                  <nav className="space-y-1 text-xs font-bold">
                    <button
                      onClick={() => setAdminActiveTab("analytics")}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-left ${
                        adminActiveTab === "analytics" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Sales Analytics</span>
                    </button>
                    
                    <button
                      onClick={() => setAdminActiveTab("products")}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-left ${
                        adminActiveTab === "products" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>Manage Products</span>
                    </button>

                    <button
                      onClick={() => setAdminActiveTab("orders")}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-left ${
                        adminActiveTab === "orders" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Fulfill Orders</span>
                      {adminAnalytics?.statusBreakdown?.pending ? (
                        <span className="ml-auto bg-amber-500 text-slate-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                          {adminAnalytics.statusBreakdown.pending}
                        </span>
                      ) : null}
                    </button>

                    <button
                      onClick={() => setAdminActiveTab("customers")}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-left ${
                        adminActiveTab === "customers" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Registered Shoppers</span>
                    </button>
                  </nav>
                </div>

              </div>

              {/* Sidebar footer credentials */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
                <p className="font-extrabold text-white truncate">{user.name}</p>
                <span className="text-[10px] text-indigo-400 tracking-wider">Enterprise Administrator</span>
              </div>
            </div>

            {/* Admin Right-side Interactive panels */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-8 space-y-8">
              
              {/* TAB 1: ADVANCED LIVE ANALYTICS WITH CUSTOM INTERACTIVE SVG CHARTS */}
              {adminActiveTab === "analytics" && adminAnalytics && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-heading">Commercial Operations Metrics</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Real-time charts, category breakdowns, and physical counts analytics.</p>
                  </div>

                  {/* Top Stats summary widgets row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Aggregate Revenue</span>
                      <p className="text-2xl font-black text-slate-950">${adminAnalytics.totalRevenue.toFixed(2)}</p>
                      <span className="text-[9px] text-emerald-600 font-extrabold">✓ Fulfilled orders counting</span>
                    </div>

                    <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Fulfillment Orders</span>
                      <p className="text-2xl font-black text-slate-950">{adminAnalytics.totalOrders}</p>
                      <span className="text-xs flex gap-2 font-semibold">
                        <span className="text-amber-600">{adminAnalytics.statusBreakdown.pending} pending</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-indigo-600">{adminAnalytics.statusBreakdown.shipped} shipped</span>
                      </span>
                    </div>

                    <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Active Shoppers</span>
                      <p className="text-2xl font-black text-slate-950">{adminAnalytics.totalCustomers}</p>
                      <span className="text-[9px] text-slate-400">Total registered in database</span>
                    </div>

                    <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Catalog Variety</span>
                      <p className="text-2xl font-black text-slate-950">{adminAnalytics.totalProducts}</p>
                      <span className="text-[9px] text-indigo-600 font-bold">Across {uniqueCategories.length - 1} categories</span>
                    </div>
                  </div>

                  {/* SVG charts visual section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* SVG BAR CHART: Inventory Level per Category */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Available inventory levels per category</h4>
                        <p className="text-[10px] text-slate-400">Physical stock volume distribution in database</p>
                      </div>

                      {/* SVG bar render */}
                      <div className="h-60 flex items-end justify-between pt-10 border-b border-l pb-3 px-4 relative">
                        {adminAnalytics.categoryBreakdown.map((item, index) => {
                          const maxStock = Math.max(...adminAnalytics.categoryBreakdown.map(c => c.stock), 10);
                          const barHeightPercentage = (item.stock / maxStock) * 100;
                          
                          return (
                            <div key={item.category} className="flex flex-col items-center flex-1 max-w-[50px] group cursor-pointer relative">
                              <div 
                                className="w-6 bg-indigo-650 hover:bg-indigo-600 rounded-t-md transition-all duration-500 bg-indigo-600"
                                style={{ height: `${Math.max(barHeightPercentage, 5)}%`, minHeight: "10px" }}
                              >
                                {/* tooltip popover */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-900 text-white font-mono text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none mb-1">
                                  {item.stock}units
                                </div>
                              </div>
                              <span className="text-[8px] text-slate-400 truncate w-full text-center mt-2 font-medium font-mono">
                                {item.category}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* PIE CHART / LIST: TOP SOLD PRODUCTS BY VALUE GENERATED */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue generated leaderboard list</h4>
                        <p className="text-[10px] text-slate-400">Top selling items in the store</p>
                      </div>

                      <div className="space-y-3.5 pr-2">
                        {adminAnalytics.topProducts.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-6">No sales transactions have occurred yet.</p>
                        ) : (
                          adminAnalytics.topProducts.map((p, i) => (
                            <div key={p.productId} className="flex items-center justify-between text-xs pb-2 border-b last:border-b-0 last:pb-0">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 bg-indigo-50 text-indigo-700 rounded font-bold flex items-center justify-center text-[10px]">
                                  {i + 1}
                                </span>
                                <span className="font-bold text-slate-800 line-clamp-1 max-w-[180px]">{p.name || "Unknown Item"}</span>
                              </div>
                              <div className="text-right flex items-center gap-4">
                                <span className="text-slate-400 text-[10px]">{p.units} units sold</span>
                                <span className="font-black text-slate-950 font-mono">${p.revenue.toFixed(2)}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                  {/* RECENT ORDERS LOGS */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Commerce Inbound Logs</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b text-slate-400 uppercase tracking-wider text-[9px]">
                            <th className="py-2.5">ID</th>
                            <th>Recipient Client</th>
                            <th>Amount Sum</th>
                            <th>Fulfillment State</th>
                            <th>Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700">
                          {adminAnalytics.recentOrders.map((ro) => (
                            <tr key={ro.id} className="hover:bg-slate-50">
                              <td className="py-2.5 font-mono text-indigo-600 font-bold">{ro.id}</td>
                              <td>
                                <p className="font-bold">{ro.userName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{ro.userEmail}</p>
                              </td>
                              <td className="font-bold font-mono text-slate-950">${ro.totalAmount.toFixed(2)}</td>
                              <td>
                                <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-bold tracking-wider ${
                                  ro.status === "delivered" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                }`}>
                                  {ro.status}
                                </span>
                              </td>
                              <td className="text-slate-400 font-mono text-[10px]">{new Date(ro.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: PRODUCT MANAGEMENT AND CONSTRUCTOR FORM */}
              {adminActiveTab === "products" && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  
                  {/* Left list columns */}
                  <div className="xl:col-span-7 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h2 className="text-lg font-black text-slate-900 font-heading">Physical Stock Listings</h2>
                        <p className="text-[10px] text-slate-400">Total variants active in inventory list.</p>
                      </div>

                      <button
                        onClick={() => {
                          setProductForm({
                            name: "",
                            category: "Smart Home",
                            price: 49.99,
                            discount: 0,
                            inventory: 15,
                            description: "",
                            imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
                            specifications: { "Power": "Standard Batteries" }
                          });
                          setEditingProductId(null);
                        }}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Product Variant</span>
                      </button>
                    </div>

                    <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-2">
                      {products.map((p) => (
                        <div key={p.id} className="bg-white border rounded-2xl p-4 flex gap-4 hover:border-indigo-400 transition-all text-xs">
                          <img src={p.imageUrl} alt={p.name} className="w-14 h-14 object-cover rounded-xl border flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <h4 className="font-bold text-slate-900 truncate">{p.name}</h4>
                              <p className="font-extrabold text-slate-900 font-mono">${p.price.toFixed(2)}</p>
                            </div>
                            <p className="text-indigo-600 font-mono text-[9px] uppercase font-bold mt-0.5">{p.category} | Stock: {p.inventory} left</p>
                            
                            <div className="flex items-center gap-2 mt-3.5 pt-2 border-t text-[10px]">
                              <button onClick={() => startEditProduct(p)} className="flex items-center gap-1 text-indigo-600 hover:underline">
                                <Edit className="w-3.5 h-3.5" /> Modify
                              </button>
                              <span className="text-slate-200">|</span>
                              <button onClick={() => deleteProduct(p.id)} className="flex items-center gap-1 text-rose-600 hover:underline">
                                <Trash2 className="w-3.5 h-3.5" /> Pull List
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Form detail sidebar */}
                  <div className="xl:col-span-5 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-xs space-y-4">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight border-b border-slate-100 pb-2">
                      {editingProductId ? "Modify Existing Specification" : "Constructor: Create Product listing"}
                    </h3>

                    {productForm ? (
                      <form onSubmit={handleProductFormSubmit} className="space-y-4">
                        
                        <div>
                          <label className="block text-slate-400 font-bold mb-1">Item Title Name</label>
                          <input
                            type="text"
                            value={productForm.name || ""}
                            onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-400 font-bold mb-1">Assigned Category</label>
                            <input
                              type="text"
                              value={productForm.category || ""}
                              onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 font-bold mb-1">Base Price ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={productForm.price || 0}
                              onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})}
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-400 font-bold mb-1">Discount (% Off)</label>
                            <input
                              type="number"
                              value={productForm.discount || 0}
                              onChange={(e) => setProductForm({...productForm, discount: Number(e.target.value)})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 font-bold mb-1">Initial Stock quantity</label>
                            <input
                              type="number"
                              value={productForm.inventory || 0}
                              onChange={(e) => setProductForm({...productForm, inventory: Number(e.target.value)})}
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 font-bold mb-1">Image Asset URL</label>
                          <input
                            type="text"
                            value={productForm.imageUrl || ""}
                            onChange={(e) => setProductForm({...productForm, imageUrl: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 font-bold mb-1">Detail Paragraph Description</label>
                          <textarea
                            value={productForm.description || ""}
                            onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                          />
                        </div>

                        <div className="pt-2 flex justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => { setProductForm(null); setEditingProductId(null); }}
                            className="px-4 py-2 hover:bg-slate-50 border font-bold text-slate-500 rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs shadow"
                          >
                            Save Specification details
                          </button>
                        </div>

                      </form>
                    ) : (
                      <div className="text-center py-10 bg-slate-50 border rounded-xl p-4">
                        <p className="text-slate-400 italic">No item is being modified or created currently. Click "Add New Product" or click "Modify" on a listing card.</p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 3: ADMIN ACTIVE CUSTOMER ORDERS FULFILLMENT LIST */}
              {adminActiveTab === "orders" && adminAnalytics && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 font-heading">Fulfillment & Operations tracking registry</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">Adjust client shipping milestones and verify items stock deductions.</p>
                  </div>

                  <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b text-slate-400 uppercase tracking-wider text-[9px] pb-2">
                            <th className="py-3">Order ID</th>
                            <th>Customer info</th>
                            <th>Subtotal</th>
                            <th>Status control</th>
                            <th>Action dispatch</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700">
                          {adminAnalytics.recentOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-50/65">
                              <td className="py-4 font-mono text-indigo-700 font-extrabold">{ord.id}</td>
                              <td>
                                <p className="font-bold text-slate-800">{ord.userName}</p>
                                <p className="text-[10px] text-slate-450 font-mono">{ord.userEmail}</p>
                                <p className="text-[11px] text-slate-500 italic mt-0.5">Zip code: {ord.shippingAddress.zipCode}</p>
                              </td>
                              <td className="font-bold text-slate-950 font-mono">${ord.totalAmount.toFixed(2)}</td>
                              <td>
                                <select
                                  value={ord.status}
                                  onChange={(e) => updateOrderStatus(ord.id, e.target.value)}
                                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-700"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="canceled">Canceled</option>
                                </select>
                              </td>
                              <td>
                                <button
                                  onClick={() => { setSelectedOrder(ord); setCurrentView("order-details"); }}
                                  className="text-[11px] font-bold text-indigo-600 hover:underline"
                                >
                                  Inspect Details ➜
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: REGISTERED USER CLIEN TELE LISTS */}
              {adminActiveTab === "customers" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 font-heading">Registered Customer Clientele</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">A dynamic database log of all shoppers registered in custom store.</p>
                  </div>

                  <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b text-slate-400 uppercase tracking-wider text-[9px] pb-2">
                            <th className="py-3">Unique Identifier (ID)</th>
                            <th>Shopper Name</th>
                            <th>Shopper Email</th>
                            <th>Account Role</th>
                            <th>Date registered</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700">
                          {allUsers.map((client) => (
                            <tr key={client.id} className="hover:bg-slate-50">
                              <td className="py-4 font-mono font-bold text-slate-400">{client.id}</td>
                              <td className="font-bold text-slate-950">{client.name}</td>
                              <td className="font-semibold text-slate-700">{client.email}</td>
                              <td>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                                  client.role === "admin" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-750"
                                }`}>
                                  {client.role}
                                </span>
                              </td>
                              <td className="text-slate-400 font-mono font-medium">{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "Prior Seed"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* FOOTER GENERAL ASSIGNMENT */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold shadow-sm">
                NC
              </div>
              <span className="text-base font-bold text-white tracking-tight">NexCart Marketplace</span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-xs">
              Express fullstack sandbox checkout application supporting immediate buyer flows and merchant controllers.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider">Quick Client Testing credentials</h4>
            <div className="space-y-1 bg-slate-800/40 border border-slate-800 p-3 rounded-lg text-[10px] leading-normal font-mono">
              <p><strong>Admin Profile:</strong> admin@nexcart.com / adminpassword123</p>
              <p><strong>Standard User:</strong> shreshta@nexcart.com / userpassword123</p>
            </div>
          </div>

          <div className="space-y-2 lg:pl-10">
            <h4 className="font-bold text-white uppercase tracking-wider">Assurance Seals</h4>
            <p className="text-slate-400 italic">✓ Fully responsive viewport layout</p>
            <p className="text-slate-400 italic">✓ Standardized JSON local persistence state</p>
            <p className="text-slate-400 italic">✓ Absolute secure SSL checkout processing model</p>
          </div>

        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 border-t border-slate-850 mt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500">
          <p>© 2026 NexCart Incorporated and sandbox processors. All rights reserved.</p>
          <div className="flex gap-4 mt-2 sm:mt-0 font-medium">
            <span className="hover:text-white cursor-pointer select-none">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer select-none">Privacy standard</span>
          </div>
        </div>
      </footer>

      {/* CART OVERLAY / DRAWER CONTAINER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-55 flex justify-end" id="cart-overlay-panel">
          
          {/* Backdrop screen */}
          <div onClick={() => setIsCartOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"></div>
          
          {/* Drawer content chassis */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-fade-in-right">
            
            {/* Header drawer */}
            <div className="p-4 border-b border-slate-205 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Your Shopper Bag ({cartItems.length})</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List drawer */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-20 space-y-3">
                  <div className="text-5xl">🛍️</div>
                  <h4 className="text-sm font-bold text-slate-800">Your cart is currently empty</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">Browse catalog items, click "Add to Cart" or choose immediate "Shop Now".</p>
                </div>
              ) : (
                cartItems.map((item) => {
                  const finalPrice = (item.product.price * (1 - item.product.discount / 100)).toFixed(2);
                  return (
                    <div key={item.product.id} className="flex gap-3 text-xs border-b last:border-b-0 pb-3 last:pb-0">
                      <div className="w-16 h-16 bg-slate-50 rounded-lg overflow-hidden border flex-shrink-0">
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-slate-950 truncate">{item.product.name}</p>
                          <p className="text-slate-400 text-[10px] mt-0.5 capitalize">{item.product.category}</p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          {/* Qty count selector */}
                          <div className="flex items-center gap-2 border rounded-lg bg-slate-50">
                            <button
                              onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                              className="px-2 py-1 text-slate-500 hover:text-indigo-600 font-black"
                            >
                              -
                            </button>
                            <span className="font-extrabold text-slate-800 text-[11px]">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                              className="px-2 py-1 text-slate-500 hover:text-indigo-600 font-black"
                            >
                              +
                            </button>
                          </div>
                          
                          <div className="text-right">
                            <span className="font-black text-slate-950 font-mono">${(Number(finalPrice) * item.quantity).toFixed(2)}</span>
                            <button onClick={() => removeFromCart(item.product.id)} className="block text-[10px] text-rose-500 hover:underline mt-0.5">
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Calculations and checkout dispatch trigger in drawer */}
            {cartItems.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-600">Items subtotal:</span>
                  <span className="text-xl font-black text-slate-950 font-mono">${getSubtotal().toFixed(2)}</span>
                </div>
                
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCurrentView("checkout");
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-slate-900 text-white font-extrabold rounded-xl shadow-lg transition-all text-center block text-sm"
                >
                  Proceed to Secure Checkout
                </button>
                <p className="text-center text-[10px] text-slate-400">🔒 Secure sandbox processing.</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* AUTH REGISTER / LOGIN MODAL ACCORDIAN */}
      {authModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4" id="auth-modal-panel">
          <div onClick={() => setAuthModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"></div>
          
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 space-y-5 animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-black text-slate-950 font-heading">
                {authMode === "login" ? "Secure Portal Sign In" : "Register NexCart Account"}
              </h3>
              <button onClick={() => setAuthModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {authError && (
              <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-rose-700 text-xs font-semibold leading-relaxed">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              
              {authMode === "register" && (
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Full Name</label>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                    required
                    placeholder="Shreshta"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Email Address</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                  required
                  placeholder="shreshta@nexcart.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-indigo-600 text-white font-extrabold rounded-xl transition"
              >
                {authMode === "login" ? "Authorize Sign In" : "Register Account"}
              </button>
            </form>

            {/* Quick pre-fill demo shortcuts */}
            <div className="border-t pt-3 space-y-1.5">
              <span className="block text-slate-400 font-extrabold uppercase tracking-widest text-[8px]">Quick testing shortcut clickers</span>
              
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setAuthForm({ name: "Shreshta", email: "shreshta@nexcart.com", password: "userpassword123" })}
                  className="p-2 border border-slate-200 hover:border-indigo-600 rounded-xl text-left bg-slate-50 hover:bg-white"
                >
                  <p className="font-bold text-slate-800 leading-none">Standard User</p>
                  <p className="text-[8px] text-slate-400">shreshta@nexcart.com</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthForm({ name: "NexCart Owner", email: "admin@nexcart.com", password: "adminpassword123" })}
                  className="p-2 border border-slate-200 hover:border-indigo-650 rounded-xl text-left bg-indigo-50/20 hover:bg-white"
                >
                  <p className="font-bold text-indigo-700 leading-none">Admin Profile</p>
                  <p className="text-[8px] text-slate-400">admin@nexcart.com</p>
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              {authMode === "login" ? (
                <p className="text-slate-550">
                  New to operations?{" "}
                  <button onClick={() => { setAuthMode("register"); setAuthError(""); }} className="text-indigo-600 hover:underline font-bold">
                    Create Account
                  </button>
                </p>
              ) : (
                <p className="text-slate-550">
                  Already registered?{" "}
                  <button onClick={() => { setAuthMode("login"); setAuthError(""); }} className="text-indigo-600 hover:underline font-bold">
                    Sign In
                  </button>
                </p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
