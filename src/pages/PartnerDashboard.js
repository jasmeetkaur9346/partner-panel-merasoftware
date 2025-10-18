import React, { useEffect, useState, Fragment, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  FaUsers,
  FaMoneyBillWave,
  FaChartLine,
  FaWallet,
  FaPlus,
  FaExchangeAlt,
  FaSignOutAlt,
} from "react-icons/fa";
import SummaryApi from "../common";
import { toast } from "react-toastify";
import moment from "moment";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
  CheckCircle,
  Clock,
  TrendingUp,
  Menu,
  X,
  Home,
  LogOut,
  Users,
  Calendar,
  User,
  CreditCard,
  FileText,
  KeyRound,
  Trash2,
  Info,
} from "lucide-react"; // Add new icons
import { setUserDetails, updateUserRole } from "../store/userSlice";
import ROLE from "../common/role";
import CookieManager from "../utils/cookieManager";
import StorageService from "../utils/storageService";
import TriangleMazeLoader from "../components/TriangleMazeLoader";
import { FaRegCircleUser } from "react-icons/fa6";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CompleteProfile from "./CompleteProfile"; // Import the repurposed CompleteProfile component
import imageTobase64 from "../helpers/imageTobase64"; // Needed for QR code upload
import { useAuth } from "../context/AuthContext";

const PartnerDashboard = () => {
  const user = useSelector((state) => state?.user?.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { logout: logoutSession } = useAuth();

  // ====== New States for Settings and Modals ======
  const [activeTab, setActiveTab] = useState("dashboard"); // Main tabs: dashboard, customers, wallet, settings
  const [activeSettingSubTab, setActiveSettingSubTab] = useState("profile"); // Sub-tabs for settings: profile, kyc, bankAccounts, password
  const [showKycPendingPopup, setShowKycPendingPopup] = useState(false);
  const [showAddBankAccountModal, setShowAddBankAccountModal] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState({
    bankName: "",
    bankAccountNumber: "",
    bankIFSCCode: "",
    accountHolderName: "",
    upiId: "",
    qrCode: null,
    isPrimary: false,
  });
  const [isAddingBankAccount, setIsAddingBankAccount] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    age: "",
  });
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

// --- NEW KYC RIBBON STATES ---
const [kycStatusData, setKycStatusData] = useState(null); // Holds { kycStatus, kycRejectionReasons }
const [showKycApprovedRibbon, setShowKycApprovedRibbon] = useState(false);
const [showKycRejectedRibbon, setShowKycRejectedRibbon] = useState(false);
// --- END NEW KYC RIBBON STATES ---

  // ====== Existing States (keep as is) ======
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [isRoleSwitching, setIsRoleSwitching] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalCommissionEarned, setTotalCommissionEarned] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showTransactionDetailModal, setShowTransactionDetailModal] =
    useState(false);
  const [selectedTransactionDetail, setSelectedTransactionDetail] =
    useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Loading states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCommissions, setLoadingCommissions] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Add New Customer Modal State
  const [openAddCustomerModal, setOpenAddCustomerModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Withdrawal Request Modal States
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [selectedBankAccountIndex, setSelectedBankAccountIndex] = useState("");
  const [isRequestingWithdrawal, setIsRequestingWithdrawal] = useState(false);
  // const [bankAccounts, setBankAccounts] = useState([]) // This will now come from user object directly

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch(SummaryApi.getCommissionWalletSummary.url, {
        method: SummaryApi.getCommissionWalletSummary.method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setWalletBalance(data.data.availableBalance || 0);
      }
    } catch (error) {
      console.error("Error fetching wallet summary:", error);
      toast.error("Error fetching wallet summary");
    } finally {
      setLoadingStats(false);
    }
  };

  // Calculate total commission from commission history
  const calculateTotalCommission = (commissions) => {
    const total = commissions.reduce((sum, commission) => {
      // Only count positive amounts for total commission calculation
      if (commission.commissionAmount > 0) {
        return sum + (commission.commissionAmount || 0);
      }
      return sum;
    }, 0);
    setTotalCommissionEarned(total);
  };

  // Fetch commission history for recent transactions AND total calculation
  const fetchCommissionHistory = async () => {
    try {
      setLoadingCommissions(true);

      // Calculate date for last 7 days
      const sevenDaysAgo = moment().subtract(7, "days").toISOString();

      // Commission history fetch करें
      const commissionResponse = await fetch(
        SummaryApi.getCommissionHistory.url,
        {
          method: SummaryApi.getCommissionHistory.method,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Withdrawal history fetch करें
      const withdrawalResponse = await fetch(
        SummaryApi.getWithdrawalHistory.url,
        {
          method: SummaryApi.getWithdrawalHistory.method,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const commissionData = await commissionResponse.json();
      const withdrawalData = await withdrawalResponse.json();

      if (commissionData.success && withdrawalData.success) {
        // Withdrawal requests ko commission format में convert करें
        const formattedWithdrawals = withdrawalData.data.map((withdrawal) => ({
          _id: withdrawal._id,
          customerName: "Admin Transfer",
          commissionType: "Withdrawal Request",
          createdAt: withdrawal.createdAt,
          status: withdrawal.status,
          commissionAmount: -withdrawal.requestedAmount, // Negative amount
          adminResponse: withdrawal.adminResponse, // Add this line
          selectedBankAccount: withdrawal.selectedBankAccount,
        }));

        // दोनों को combine करके date wise sort करें
        const combinedHistory = [
          ...commissionData.data,
          ...formattedWithdrawals,
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        // .slice(0, 10)

        setCommissionHistory(combinedHistory);

        // Total commission calculation (only positive amounts)
        calculateTotalCommission(commissionData.data);
      }
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      toast.error("Error fetching transaction history");
    } finally {
      setLoadingCommissions(false);
    }
  };

  // Fetch customers list using correct API endpoint
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await fetch(SummaryApi.partnerCustomers.url, {
        method: SummaryApi.partnerCustomers.method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setCustomers(data.data);
        setTotalUsers(data.data.length);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Error fetching customers");
    } finally {
      setLoadingCustomers(false);
      setLoadingStats(false);
    }
  };

  // Handle new customer form submission
  const handleAddCustomer = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Password and confirm password do not match");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: "customer",
        referredBy: user._id,
      };

      const response = await fetch(SummaryApi.signUP.url, {
        method: SummaryApi.signUP.method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Customer created successfully");
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
        setOpenAddCustomerModal(false);
        fetchCustomers();
        fetchWalletBalance();
      } else {
        toast.error(result.message || "Failed to create customer");
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      toast.error("Something went wrong while creating customer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (newRole) => {
    if (newRole === user?.role) {
      setRoleDropdownOpen(false);
      return;
    }
    try {
      setIsRoleSwitching(true);

      const response = await fetch(SummaryApi.userRoleSwitch.url, {
        method: SummaryApi.userRoleSwitch.method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newRole }),
      });
      const data = await response.json();
      if (data.success) {
        dispatch(updateUserRole(newRole));
        const updatedUser = { ...(user || {}), role: newRole };
        StorageService.setUserDetails(updatedUser);
        dispatch(setUserDetails(updatedUser));
        toast.success("Role switched to " + newRole);
        setRoleDropdownOpen(false);
        CookieManager.setUserDetails({ ...(user || {}), role: newRole });

        const isDetailsCompleted =
          user?.userDetails?.isDetailsCompleted || false;
        if (!isDetailsCompleted && newRole !== "customer") {
          setTimeout(() => {
            navigate("/complete-profile");
            setIsRoleSwitching(false);
          }, 100);
        } else {
          let redirectPath = "/";
          switch (newRole) {
            case ROLE.ADMIN:
              redirectPath = "/admin-panel/all-products";
              break;
            case ROLE.MANAGER:
              redirectPath = "/manager-panel/dashboard";
              break;
            case ROLE.PARTNER:
              redirectPath = "/partner-panel/dashboard";
              break;
            case ROLE.DEVELOPER:
              redirectPath = "/developer-panel";
              break;
            case ROLE.CUSTOMER:
              redirectPath = "/home";
              break;
          }
          setTimeout(() => {
            navigate(redirectPath);
            setIsRoleSwitching(false);
          }, 100);
        }
      } else {
        toast.error(data.message || "Failed to switch role");
        setIsRoleSwitching(false);
      }
    } catch (error) {
      console.error("Error switching role:", error);
      toast.error("Error switching role");
      setIsRoleSwitching(false);
    }
    setRoleDropdownOpen(false);
  };

  const handleLogout = useCallback(async () => {
    try {
      setIsSigningOut(true);
      await logoutSession();
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Unable to logout right now. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }, [logoutSession]);

  // ====== Helper Functions ======
  const isValidImageType = (file) => {
    return file && (file.type === "image/jpeg" || file.type === "image/jpg");
  };

  // ====== Fetch Bank Accounts (New Function) ======
  const fetchBankAccounts = async () => {
    try {
      const response = await fetch(SummaryApi.getBankAccounts.url, {
        method: SummaryApi.getBankAccounts.method,
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        // Dispatch to update user state with latest bank accounts
        dispatch(
          setUserDetails({
            ...(user || {}),
            bankAccounts: data.data,
          })
        );
      } else {
        toast.error(data.message || "Failed to fetch bank accounts.");
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      toast.error("Error fetching bank accounts.");
    }
  };

  // --- NEW: Fetch User KYC Status ---
    const fetchUserKycStatus = async () => {
      try {
        const response = await fetch(SummaryApi.getUserKycStatus.url, {
          method: SummaryApi.getUserKycStatus.method,
          credentials: "include",
        });
        const data = await response.json();
        if (data.success) {
          setKycStatusData(data.data);
          // Update Redux user state with latest KYC details
          dispatch(
            setUserDetails({
              ...(user || {}),
              userDetails: { ...(user?.userDetails || {}), ...data.data },
            })
          );
  
          // Set ribbon visibility based on fetched status
          if (data.data.kycStatus === "approved") {
            // Check localStorage to see if the ribbon was previously closed
            const ribbonClosed = localStorage.getItem("kycApprovedRibbonClosed");
            if (!ribbonClosed || ribbonClosed !== data.data.kycApprovedAt) {
              // Show if not closed or if approvedAt changed
              setShowKycApprovedRibbon(true);
            }
            setShowKycRejectedRibbon(false);
          } else if (data.data.kycStatus === "rejected") {
            // Check localStorage to see if the ribbon was previously closed
            const ribbonClosed = localStorage.getItem("kycRejectedRibbonClosed");
            if (!ribbonClosed || ribbonClosed !== data.data.kycRejectedAt) {
              // Show if not closed or if rejectedAt changed
              setShowKycRejectedRibbon(true);
            }
            setShowKycApprovedRibbon(false);
          } else {
            setShowKycApprovedRibbon(false);
            setShowKycRejectedRibbon(false);
          }
        } else {
          toast.error(data.message || "Failed to fetch KYC status.");
        }
      } catch (error) {
        console.error("Error fetching KYC status:", error);
        toast.error("Error fetching KYC status.");
      }
    };
    // --- END NEW: Fetch User KYC Status ---

    // ====== Handle Request Transfer Button Click ======
  const handleRequestTransferClick = () => {
    if (
      !user?.userDetails?.isDetailsCompleted ||
      user?.userDetails?.kycStatus !== "approved"
    ) {
      setShowKycPendingPopup(true); // This popup will now also cover 'pending' and 'rejected' statuses
    } else {
      setShowWithdrawalModal(true);
    }
  };

  // ====== Handle Add Bank Account (New) ======
  const handleAddBankAccount = async (e) => {
    e.preventDefault();
    setIsAddingBankAccount(true);
    try {
      const payload = {
        ...newBankAccount,
        isPrimary: newBankAccount.isPrimary || user.bankAccounts.length === 0, // Make first account primary by default
      };
      const response = await fetch(SummaryApi.addBankAccount.url, {
        method: SummaryApi.addBankAccount.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Bank account added successfully!");
        setShowAddBankAccountModal(false);
        setNewBankAccount({
          bankName: "",
          bankAccountNumber: "",
          bankIFSCCode: "",
          accountHolderName: "",
          upiId: "",
          qrCode: null,
          isPrimary: false,
        });
        // Update Redux user state with new bank accounts
        dispatch(
          setUserDetails({
            ...(user || {}),
            bankAccounts: data.data,
          })
        );
      } else {
        toast.error(data.message || "Failed to add bank account.");
      }
    } catch (error) {
      console.error("Error adding bank account:", error);
      toast.error("An error occurred while adding bank account.");
    } finally {
      setIsAddingBankAccount(false);
    }
  };

  const handleBankQrUpload = async (file) => {
    if (!isValidImageType(file)) {
      toast.error("Only JPG/JPEG images are allowed.");
      return;
    }
    const base64Image = await imageTobase64(file);
    setNewBankAccount((prev) => ({ ...prev, qrCode: base64Image }));
  };

  // ====== Handle Profile Update (New) ======
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const payload = {
        name: profileFormData.name,
        phone: profileFormData.phone,
        dob: profileFormData.dob,
        age: parseInt(profileFormData.age, 10),
      };
      const response = await fetch(SummaryApi.updateUser.url, {
        // Assuming you have an updateUser API
        method: SummaryApi.updateUser.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Profile updated successfully!");
        dispatch(setUserDetails(data.data)); // Update Redux state
      } else {
        toast.error(data.message || "Failed to update profile.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An error occurred while updating profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // ====== Handle Password Change (New) ======
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordFormData.newPassword !== passwordFormData.confirmNewPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      const response = await fetch(SummaryApi.changePassword.url, {
        // Assuming you have a changePassword API
        method: SummaryApi.changePassword.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordFormData.currentPassword,
          newPassword: passwordFormData.newPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Password changed successfully!");
        setShowPasswordChangeModal(false);
        setPasswordFormData({
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });
      } else {
        toast.error(data.message || "Failed to change password.");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("An error occurred while changing password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ====== Effects ======
  useEffect(() => {
    if (!user?._id) {
      return;
    }
    fetchWalletBalance();
    fetchCommissionHistory();
    fetchCustomers();
    fetchUserKycStatus();
  }, [user?._id]);

  // Separate useEffect for profile form data:
  useEffect(() => {
    if (user) {
      setProfileFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        dob: user.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
        age: user.age || "",
      });
    }
  }, [user]);

  // Modify handleWithdrawalRequest to use user.bankAccounts directly
  const handleWithdrawalRequest = async () => {
    if (
      !withdrawalAmount ||
      isNaN(withdrawalAmount) ||
      parseFloat(withdrawalAmount) <= 0
    ) {
      toast.error("Please enter a valid positive amount.");
      return;
    }
    if (parseFloat(withdrawalAmount) > walletBalance) {
      toast.error("Requested amount exceeds available balance.");
      return;
    }
    // ... (existing validation)
    if (!user.bankAccounts || user.bankAccounts.length === 0) {
      toast.error(
        "No bank accounts found. Please add a bank account in Settings."
      );
      return;
    }
    if (selectedBankAccountIndex === "" || selectedBankAccountIndex === null) {
      toast.error("Please select a bank account.");
      return;
    }

    const confirmWithdrawal = window.confirm(
      `Are you sure you want to withdraw ${formatCurrency(
        parseFloat(withdrawalAmount)
      )} to your selected account?`
    );

    if (!confirmWithdrawal) {
      return;
    }

    setIsRequestingWithdrawal(true);
    try {
      const response = await fetch(SummaryApi.requestWithdrawal.url, {
        method: SummaryApi.requestWithdrawal.method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          amount: parseFloat(withdrawalAmount),
          selectedBankAccountIndex: parseInt(selectedBankAccountIndex),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setShowWithdrawalModal(false);
        setWithdrawalAmount("");
        setSelectedBankAccountIndex("");

        setWalletBalance((prev) => prev - parseFloat(withdrawalAmount));

        const withdrawalEntry = {
          _id: `withdrawal_${Date.now()}`,
          customerName: "Admin Transfer",
          commissionType: "Withdrawal Request",
          createdAt: new Date().toISOString(),
          status: "pending",
          commissionAmount: -parseFloat(withdrawalAmount),
        };

        setCommissionHistory((prev) => [withdrawalEntry, ...prev.slice(0, 9)]);

        setTimeout(() => {
          fetchWalletBalance();
        }, 1000);
      } else {
        toast.error(result.message || "Failed to submit withdrawal request.");
      }
    } catch (error) {
      console.error("Error submitting withdrawal request:", error);
      toast.error("Something went wrong while submitting your request.");
    } finally {
      setIsRequestingWithdrawal(false);
    }
  };

  // Format commission type for display
  const formatCommissionType = (type) => {
    switch (type) {
      case "first_purchase":
        return "First Purchase";
      case "repeat_purchase":
        return "Repeat Purchase";
      case "referral_bonus":
        return "Referral Bonus";
      case "Withdrawal Request":
        return "Withdrawal Request";
      default:
        return type?.replace(/_/g, " ")?.toUpperCase() || "Commission";
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
      case "approved":
      case "Credited":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "Transferred":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (transaction) => {
    if (transaction.commissionType === "Withdrawal Request") {
      switch (transaction.status) {
        case "approved":
          return "Transferred";
        case "pending":
          return "Transfer";
        case "rejected":
          return "Rejected";
        default:
          return "Transfer";
      }
    } else {
      return transaction.status === "credited" ? "Credited" : "Pending";
    }
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "customers", label: "My Customers", icon: FaUsers },
    { id: "wallet", label: "Wallet", icon: FaWallet },
    { id: "settings", label: "Settings", icon: KeyRound }, // New Settings tab
  ];

  // Render Settings Content (New Component/JSX)
  const renderSettingsContent = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Settings Menu */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Settings Options
          </h3>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSettingSubTab("profile")}
              className={`w-full text-left flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                activeSettingSubTab === "profile"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <User className="mr-3 h-5 w-5" /> Profile
            </button>
           {/* --- NEW: Conditionally render KYC tab based on kycStatus --- */}
                       {user?.userDetails?.kycStatus !== "approved" && (
                         <button
                           onClick={() => setActiveSettingSubTab("kyc")}
                           className={`w-full text-left flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                             activeSettingSubTab === "kyc"
                               ? "bg-blue-100 text-blue-700"
                               : "text-gray-700 hover:bg-gray-50"
                           }`}
                         >
                           <FileText className="mr-3 h-5 w-5" /> KYC
                         </button>
                       )}
                       {/* --- END NEW: Conditionally render KYC tab --- */}
            <button
              onClick={() => setActiveSettingSubTab("bankAccounts")}
              className={`w-full text-left flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                activeSettingSubTab === "bankAccounts"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <CreditCard className="mr-3 h-5 w-5" /> Bank Accounts
            </button>
            <button
              onClick={() => setShowPasswordChangeModal(true)} // Open modal for password change
              className={`w-full text-left flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                activeSettingSubTab === "password"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <KeyRound className="mr-3 h-5 w-5" /> Change Password
            </button>
          </nav>
        </div>

        {/* Right Side: Content Area */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          {activeSettingSubTab === "profile" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Profile Details
              </h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileFormData.name}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileFormData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileFormData.phone}
                    onChange={(e) =>
                      setProfileFormData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={profileFormData.dob}
                    onChange={(e) => {
                      const dobValue = e.target.value;
                      setProfileFormData((prev) => ({
                        ...prev,
                        dob: dobValue,
                      }));
                      if (dobValue) {
                        const birthDate = new Date(dobValue);
                        const today = new Date();
                        let calculatedAge =
                          today.getFullYear() - birthDate.getFullYear();
                        const monthDiff =
                          today.getMonth() - birthDate.getMonth();
                        if (
                          monthDiff < 0 ||
                          (monthDiff === 0 &&
                            today.getDate() < birthDate.getDate())
                        ) {
                          calculatedAge--;
                        }
                        setProfileFormData((prev) => ({
                          ...prev,
                          age: calculatedAge.toString(),
                        }));
                      } else {
                        setProfileFormData((prev) => ({ ...prev, age: "" }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    value={profileFormData.age}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdatingProfile ? "Updating..." : "Update Profile"}
                </button>
              </form>
            </div>
          )}

          {/* --- NEW: KYC Section --- */}
          {activeSettingSubTab === "kyc" &&
            user?.userDetails?.kycStatus !== "approved" && (
              <CompleteProfile
                user={user} // Pass user data
                initialData={user} // Pass initial data for form fields
                onKycComplete={() => {
                  // After KYC is complete, update user state and re-fetch KYC status
                  // This will trigger the ribbon display if approved
                  fetchUserKycStatus();
                  setActiveSettingSubTab("profile"); // Or dashboard
                }}
                onCancel={() => setActiveSettingSubTab("profile")} // Example cancel action
              />
            )}
          {/* --- END NEW: KYC Section --- */}

          {activeSettingSubTab === "bankAccounts" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Bank Accounts
                </h2>
                <button
                  onClick={() => setShowAddBankAccountModal(true)}
                  disabled={user?.bankAccounts?.length >= 2}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <FaPlus className="w-4 h-4" /> Add Account (
                  {user?.bankAccounts?.length || 0}/2)
                </button>
              </div>

              {user?.bankAccounts?.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No bank accounts added yet.</p>
                  <button
                    onClick={() => setShowAddBankAccountModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Your First Account
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {user.bankAccounts.map((account, index) => (
                    <div
                      key={account._id || index}
                      className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-800">
                          {account.bankName} - {account.bankAccountNumber}
                          {account.isPrimary && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Primary
                            </span>
                          )}
                        </h3>
                        <button
                          onClick={async () => {
                            if (
                              window.confirm(
                                "Are you sure you want to delete this bank account?"
                              )
                            ) {
                              try {
                                const response = await fetch(
                                  `${SummaryApi.deleteBankAccount.url}/${account._id}`,
                                  {
                                    method: SummaryApi.deleteBankAccount.method,
                                    credentials: "include",
                                  }
                                );
                                const data = await response.json();
                                if (data.success) {
                                  toast.success("Bank account deleted.");
                                  dispatch(
                                    setUserDetails({
                                      ...(user || {}),
                                      bankAccounts: data.data,
                                    })
                                  );
                                } else {
                                  toast.error(
                                    data.message || "Failed to delete account."
                                  );
                                }
                              } catch (error) {
                                console.error(
                                  "Error deleting bank account:",
                                  error
                                );
                                toast.error("Error deleting bank account.");
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        Holder: {account.accountHolderName}
                      </p>
                      <p className="text-sm text-gray-600">
                        IFSC: {account.bankIFSCCode}
                      </p>
                      {account.upiId && (
                        <p className="text-sm text-gray-600">
                          UPI ID: {account.upiId}
                        </p>
                      )}
                      {account.qrCode && (
                        <img
                          src={account.qrCode}
                          alt="QR Code"
                          className="mt-2 h-20 w-20 object-cover rounded"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Add TriangleMazeLoader for role switching */}
      {isRoleSwitching && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <TriangleMazeLoader />
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
         {/* --- NEW: KYC Approved Ribbon --- */}
                {showKycApprovedRibbon && kycStatusData?.kycStatus === "approved" && (
                  <div className="bg-green-100 text-green-800 px-4 py-3 flex items-center justify-between text-sm font-medium">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span>
                        Congratulations! Your KYC has been approved. You can now request
                        transfers.
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowKycApprovedRibbon(false);
                        localStorage.setItem(
                          "kycApprovedRibbonClosed",
                          kycStatusData.kycApprovedAt
                        ); // Store timestamp to prevent showing again
                      }}
                      className="text-green-800 hover:text-green-900 ml-4"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
                {/* --- END NEW: KYC Approved Ribbon --- */}
        
                {/* --- NEW: KYC Rejected Ribbon --- */}
                {showKycRejectedRibbon && kycStatusData?.kycStatus === "rejected" && (
                  <div className="bg-red-100 text-red-800 px-4 py-3 flex items-center justify-between text-sm font-medium">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                      <div className="flex items-center mb-1 sm:mb-0">
                        <Info className="w-5 h-5 mr-2" />
                        <span>Note: Your KYC submission was rejected.</span>
                      </div>
                      {kycStatusData.kycRejectionReasons &&
                        kycStatusData.kycRejectionReasons.length > 0 && (
                          <span className="ml-0 sm:ml-2 text-xs sm:text-sm">
                            Reason(s): {kycStatusData.kycRejectionReasons.join(", ")}
                          </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2 ml-auto">
                      <button
                        onClick={() => {
                          setActiveTab("settings");
                          setActiveSettingSubTab("kyc");
                          setShowKycRejectedRibbon(false);
                          localStorage.setItem(
                            "kycRejectedRibbonClosed",
                            kycStatusData.kycRejectedAt
                          ); // Store timestamp
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs sm:text-sm"
                      >
                        Resubmit KYC
                      </button>
                      <button
                        onClick={() => {
                          setShowKycRejectedRibbon(false);
                          localStorage.setItem(
                            "kycRejectedRibbonClosed",
                            kycStatusData.kycRejectedAt
                          ); // Store timestamp
                        }}
                        className="text-red-800 hover:text-red-900"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
                {/* --- END NEW: KYC Rejected Ribbon --- */}
                
        {/* Fixed Header */}
        <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 sticky top-0 z-40">
          <div className="flex items-center justify-between p-4 lg:p-6 max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              <div className="hidden lg:flex items-center space-x-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome back, {user?.name}! 👋
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Here's what's happening with your partnership
                  </p>
                </div>
              </div>
              <div className="lg:hidden">
                <p className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Welcome back, {user?.name || "Partner"}
                </p>
              </div>
            </div>

            {activeTab === "dashboard" && (
              <div className="flex items-center space-x-3">
                <div className="hidden lg:flex items-center space-x-2 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2 rounded-xl border border-emerald-200">
                  <FaWallet className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">
                    {formatCurrency(walletBalance)}
                  </span>
                </div>
                <button
                  onClick={handleRequestTransferClick} // Use the new handler
                  className="hidden lg:flex bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="hidden sm:inline">Request Transfer</span>
                </button>
              </div>
            )}
          </div>
        </div>


        <div className="flex">
          {/* Desktop Sidebar */}
          <div className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:pt-20">
            <div className="flex flex-col flex-1 min-h-0 bg-white/50 backdrop-blur-xl border-r border-gray-200/50 m-4 rounded-2xl shadow-xl">
              <div className="flex flex-col flex-1 pt-8 pb-4">
                <div className="border-gray-200 px-4">
                  <div className="text-center mb-4">
                    {user?.profilePic ? (
                      <img
                        src={user?.profilePic}
                        alt={user?.name}
                        className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <FaRegCircleUser className="w-20 h-20 rounded-full mx-auto mb-3 text-gray-400" />
                    )}
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {user?.name}
                    </h3>
                    {user?.roles && user.roles.length > 1 && (
                      <div className="relative role-dropdown-container">
                        <button
                          onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                          className="flex items-center justify-center space-x-1 text-xs text-blue-600 font-medium mx-auto mt-1"
                        >
                          <span>{user?.role?.toUpperCase()}</span>
                          {roleDropdownOpen ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                        {roleDropdownOpen && !isRoleSwitching && (
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 min-w-40">
                            {user.roles.map((roleItem) => (
                              <button
                                key={roleItem}
                                onClick={() => handleRoleChange(roleItem)}
                                className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors ${
                                  roleItem === user.role
                                    ? "font-bold bg-blue-100"
                                    : ""
                                }`}
                              >
                                {roleItem.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <nav className="flex-1 px-6 space-y-2">
                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full text-left group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                          activeTab === item.id
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </button>
                    );
                  })}

                  <div className="pt-4 border-t border-gray-200 mt-4">
                    <button
                      onClick={handleLogout}
                      disabled={isSigningOut}
                      className="w-full text-left group flex items-center px-4 py-3 text-sm font-medium rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      {isSigningOut ? "Signing out..." : "Logout"}
                    </button>
                  </div>
                </nav>
              </div>
            </div>
          </div>

          {/* Mobile Sidebar */}
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="relative flex flex-col flex-1 max-w-xs w-full bg-white rounded-r-2xl shadow-2xl">
                <div className="absolute top-0 right-0 -mr-12 pt-4">
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="ml-1 flex items-center justify-center h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="flex-1 h-0 pt-8 pb-4 overflow-y-auto">
                  <div className="px-6 mb-4 text-center">
                    {user?.profilePic ? (
                      <img
                        src={user?.profilePic}
                        alt={user?.name}
                        className="w-16 h-16 rounded-full mx-auto mb-2 object-cover border-2 border-white shadow-md"
                      />
                    ) : (
                      <FaRegCircleUser className="w-16 h-16 rounded-full mx-auto mb-2 text-gray-400" />
                    )}
                    <h3 className="font-semibold text-gray-900 text-base">
                      {user?.name}
                    </h3>
                    {user?.roles && user.roles.length > 1 && (
                      <div className="relative inline-block role-dropdown-container">
                        <button
                          onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                          className="flex items-center justify-center space-x-1 text-sm text-blue-600 font-medium mt-1"
                        >
                          <span>{user?.role?.toUpperCase()}</span>
                          {roleDropdownOpen ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                        {roleDropdownOpen && !isRoleSwitching && (
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 min-w-32">
                            {user.roles.map((roleItem) => (
                              <button
                                key={roleItem}
                                onClick={() => {
                                  handleRoleChange(roleItem);
                                  setSidebarOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors ${
                                  roleItem === user.role
                                    ? "font-bold bg-blue-100"
                                    : ""
                                }`}
                              >
                                {roleItem.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <nav className="px-6 space-y-2">
                    {/* ... (your existing mobile sidebar items) */}
                    <div className="pt-4 border-t border-gray-200 mt-4">
                      <button
                        onClick={handleLogout}
                        disabled={isSigningOut}
                        className="w-full text-left group flex items-center px-4 py-3 text-base font-medium rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <LogOut className="mr-4 h-6 w-6" />
                        {isSigningOut ? "Signing out..." : "Logout"}
                      </button>
                    </div>
                  </nav>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="lg:pl-72 flex flex-col flex-1">
            <main className="flex-1 lg:pt-0 pb-24 lg:pb-8">
              <div className="p-6 max-w-7xl mx-auto">
                {activeTab === "dashboard" && (
                  <div className="space-y-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                      {/* Current Balance */}
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                            <FaWallet className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            CURRENT BALANCE
                          </h3>
                          {loadingStats ? (
                            <div className="w-24 h-6 bg-gray-200 animate-pulse rounded"></div>
                          ) : (
                            <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                              {formatCurrency(walletBalance)}
                            </p>
                          )}
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-600">
                              +12.5%
                            </span>
                          </div>
                        </div>
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full opacity-20" />
                      </div>

                      {/* Total Commission */}
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                            <FaMoneyBillWave className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            TOTAL COMMISSION
                          </h3>
                          {loadingCommissions ? (
                            <div className="w-24 h-6 bg-gray-200 animate-pulse rounded"></div>
                          ) : (
                            <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                              {formatCurrency(totalCommissionEarned)}
                            </p>
                          )}
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-600">
                              +8.2%
                            </span>
                          </div>
                        </div>
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full opacity-20" />
                      </div>

                      {/* Total Customers */}
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                            <FaUsers className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            TOTAL CUSTOMERS
                          </h3>
                          {loadingCustomers ? (
                            <div className="w-16 h-6 bg-gray-200 animate-pulse rounded"></div>
                          ) : (
                            <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                              {totalUsers}
                            </p>
                          )}
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-600">
                              +100%
                            </span>
                          </div>
                        </div>
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full opacity-20" />
                      </div>

                      {/* Total Orders */}
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                            <FaChartLine className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            TOTAL ORDERS
                          </h3>
                          {loadingStats ? (
                            <div className="w-16 h-6 bg-gray-200 animate-pulse rounded"></div>
                          ) : (
                            <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                              {totalOrders}
                            </p>
                          )}
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3 text-red-500" />
                            <span className="text-xs font-medium text-red-600">
                              -2.5%
                            </span>
                          </div>
                        </div>
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full opacity-20" />
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">
                              Recent Transactions
                            </h2>
                            <p className="text-gray-600 text-sm">
                              Your latest earnings and transfers
                            </p>
                          </div>
                          <Bell className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>

                      <div className="p-6">
                        {loadingCommissions ? (
                          <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="flex items-center space-x-4"
                              >
                                <div className="w-12 h-12 bg-gray-200 animate-pulse rounded-xl"></div>
                                <div className="flex-1">
                                  <div className="w-40 h-4 bg-gray-200 animate-pulse rounded mb-2"></div>
                                  <div className="w-24 h-3 bg-gray-200 animate-pulse rounded"></div>
                                </div>
                                <div className="w-20 h-4 bg-gray-200 animate-pulse rounded"></div>
                              </div>
                            ))}
                          </div>
                        ) : commissionHistory.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <FaMoneyBillWave className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500">
                              No recent transactions found
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {commissionHistory.map((transaction, index) => (
                              <div
                                key={transaction._id || index}
                                className="py-6 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-6 px-6 cursor-pointer transition-all duration-150"
                                onClick={() => {
                                  setSelectedTransactionDetail(transaction);
                                  setShowTransactionDetailModal(true);
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-4 flex-1">
                                    <div
                                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        transaction.commissionType ===
                                        "Withdrawal Request"
                                          ? "bg-red-100 text-red-600"
                                          : "bg-emerald-100 text-emerald-600"
                                      }`}
                                    >
                                      {transaction.commissionType ===
                                      "Withdrawal Request" ? (
                                        <ArrowDownLeft className="w-6 h-6" />
                                      ) : (
                                        <ArrowUpRight className="w-6 h-6" />
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-gray-900 mb-1">
                                        {transaction.commissionType ===
                                        "Withdrawal Request"
                                          ? "Money Transfer Request"
                                          : `${
                                              transaction.customerName ||
                                              "Customer"
                                            } purchased ${
                                              transaction.serviceName ||
                                              "Service"
                                            }`}
                                      </h4>
                                      <div className="flex items-center space-x-2 mb-2">
                                        <span
                                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            transaction.commissionType ===
                                            "Withdrawal Request"
                                              ? "bg-red-100 text-red-700"
                                              : transaction.commissionType ===
                                                "first_purchase"
                                              ? "bg-emerald-100 text-emerald-700"
                                              : "bg-blue-100 text-blue-700"
                                          }`}
                                        >
                                          {transaction.commissionType ===
                                          "Withdrawal Request"
                                            ? "Transfer"
                                            : formatCommissionType(
                                                transaction.commissionType
                                              )}
                                        </span>
                                        <span
                                          className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                            transaction.commissionType ===
                                            "Withdrawal Request"
                                              ? transaction.status ===
                                                "approved"
                                                ? "bg-red-50 text-red-700 border-red-200"
                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                              : transaction.status ===
                                                "credited"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                          }`}
                                        >
                                          {/* Status Icons */}
                                          {transaction.commissionType ===
                                          "Withdrawal Request" ? (
                                            transaction.status ===
                                            "approved" ? (
                                              <>
                                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                                Transferred
                                              </>
                                            ) : (
                                              <>
                                                <Clock className="w-3 h-3 inline mr-1" />
                                                Pending
                                              </>
                                            )
                                          ) : transaction.status ===
                                            "credited" ? (
                                            <>
                                              <CheckCircle className="w-3 h-3 inline mr-1" />
                                              Credited
                                            </>
                                          ) : (
                                            <>
                                              <Clock className="w-3 h-3 inline mr-1" />
                                              Pending
                                            </>
                                          )}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-500">
                                        {moment(transaction.createdAt).format(
                                          "MMM DD, YYYY"
                                        )}{" "}
                                        at{" "}
                                        {moment(transaction.createdAt).format(
                                          "hh:mm A"
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right ml-4">
                                    <div
                                      className={`text-xl font-bold ${
                                        transaction.commissionType ===
                                        "Withdrawal Request"
                                          ? "text-red-600"
                                          : "text-emerald-600"
                                      }`}
                                    >
                                      {transaction.commissionType ===
                                      "Withdrawal Request"
                                        ? "-"
                                        : "+"}
                                      ₹
                                      {Math.floor(
                                        Math.abs(transaction.commissionAmount)
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {commissionHistory.length > 0 && (
                        <div className="p-6 bg-gray-50 border-t border-gray-100">
                          <button className="w-full text-center text-blue-600 font-medium hover:text-blue-700 transition-colors">
                            View All Transactions
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {activeTab === "customers" && (
                  <div className="space-y-6">
                    {/* Add New Customer Button */}
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Customer List
                        </h2>
                        <p className="text-gray-600">
                          Manage your referred customers
                        </p>
                      </div>
                      <button
                        onClick={() => setOpenAddCustomerModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <FaPlus className="w-4 h-4" />
                        Add New Customer
                      </button>
                    </div>

                    {/* Customers Table */}
                    <div className="bg-white rounded-lg shadow-md">
                      <div className="overflow-x-auto">
                        {loadingCustomers ? (
                          <div className="p-6">
                            <div className="space-y-3">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex space-x-4">
                                  <div className="w-32 h-4 bg-gray-200 animate-pulse rounded"></div>
                                  <div className="w-48 h-4 bg-gray-200 animate-pulse rounded"></div>
                                  <div className="w-32 h-4 bg-gray-200 animate-pulse rounded"></div>
                                  <div className="w-32 h-4 bg-gray-200 animate-pulse rounded"></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Mobile
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Joined Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {customers.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan="5"
                                    className="px-6 py-4 text-center text-gray-500"
                                  >
                                    No customers found
                                  </td>
                                </tr>
                              ) : (
                                customers.map((customer) => (
                                  <React.Fragment key={customer._id}>
                                    {/* Main Row */}
                                    <tr
                                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                                      onClick={() =>
                                        setExpandedCustomer(
                                          expandedCustomer === customer._id
                                            ? null
                                            : customer._id
                                        )
                                      }
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <div className="flex items-center">
                                          <span className="mr-2">
                                            {expandedCustomer === customer._id
                                              ? "▼"
                                              : "▶"}
                                          </span>
                                          {customer.name}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {customer.email}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {customer.phone || "N/A"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {moment(customer.dateAdded).format(
                                          "MMM DD, YYYY"
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                          Active
                                        </span>
                                      </td>
                                    </tr>

                                    {/* Expanded Row */}
                                    {expandedCustomer === customer._id && (
                                      <tr>
                                        <td
                                          colSpan="5"
                                          className="px-6 py-4 bg-gray-50"
                                        >
                                          <div className="space-y-4">
                                            {/* Customer Stats */}
                                            <div className="grid grid-cols-3 gap-4 mb-4">
                                              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                                <p className="text-sm text-gray-600">
                                                  Total Purchases
                                                </p>
                                                <p className="text-lg font-semibold text-blue-600">
                                                  {customer.totalPurchases}
                                                </p>
                                              </div>
                                              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                                <p className="text-sm text-gray-600">
                                                  Total Spend
                                                </p>
                                                <p className="text-lg font-semibold text-green-600">
                                                  {formatCurrency(
                                                    customer.totalSpend
                                                  )}
                                                </p>
                                              </div>
                                              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                                                <p className="text-sm text-gray-600">
                                                  Wallet Balance
                                                </p>
                                                <p className="text-lg font-semibold text-purple-600">
                                                  {formatCurrency(
                                                    customer.walletBalance
                                                  )}
                                                </p>
                                              </div>
                                            </div>

                                            {/* Edit Button */}
                                            <div className="flex justify-center">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingCustomer(
                                                    customer._id
                                                  );
                                                  setEditFormData({
                                                    name: customer.name,
                                                    email: customer.email,
                                                    phone: customer.phone || "",
                                                  });
                                                }}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                              >
                                                Edit Details
                                              </button>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                ))
                              )}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "wallet" && (
                  <div className="space-y-8">
                    {/* Wallet Header */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-600 p-3 rounded-full">
                            <FaWallet className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h1 className="text-2xl font-bold text-gray-800">
                              Commission Wallet
                            </h1>
                            <p className="text-gray-600">
                              Manage your earnings and transfers
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Balance Card */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 mb-2">
                            Available Balance
                          </p>
                          {loadingStats ? (
                            <div className="w-32 h-10 bg-blue-300 animate-pulse rounded"></div>
                          ) : (
                            <h2 className="text-4xl font-bold">
                              {formatCurrency(walletBalance)}
                            </h2>
                          )}
                          <p className="text-blue-100 mt-2">
                            Last updated:{" "}
                            {moment().format("MMM DD, YYYY, hh:mm A")}
                          </p>
                        </div>
                        <div className="bg-white/20 p-4 rounded-full">
                          <FaMoneyBillWave className="w-12 h-12" />
                        </div>
                      </div>

                      <button
                        onClick={handleRequestTransferClick} // Use the new handler
                        className="mt-6 bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2"
                      >
                        <ArrowUpRight className="w-5 h-5" />
                        <span>Transfer to Bank</span>
                      </button>
                    </div>

                    {/* Transaction History */}
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-800">
                          Transaction History
                        </h3>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="w-5 h-5" />
                          <span>Last 7 days</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {loadingCommissions ? (
                          <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl"
                              >
                                <div className="w-12 h-12 bg-gray-200 animate-pulse rounded-full"></div>
                                <div className="flex-1">
                                  <div className="w-40 h-4 bg-gray-200 animate-pulse rounded mb-2"></div>
                                  <div className="w-24 h-3 bg-gray-200 animate-pulse rounded"></div>
                                </div>
                                <div className="w-20 h-4 bg-gray-200 animate-pulse rounded"></div>
                              </div>
                            ))}
                          </div>
                        ) : commissionHistory.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <FaMoneyBillWave className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500">
                              No transactions found for the last 7 days.
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {commissionHistory.map((transaction, index) => (
                              <div
                                key={transaction._id || index}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                                onClick={() => {
                                  setSelectedTransactionDetail(transaction);
                                  setShowTransactionDetailModal(true);
                                }}
                              >
                                <div className="flex items-center space-x-4">
                                  <div
                                    className={`p-3 rounded-full ${
                                      transaction.commissionType ===
                                      "Withdrawal Request"
                                        ? "bg-red-100 text-red-600"
                                        : "bg-green-100 text-green-600"
                                    }`}
                                  >
                                    {transaction.commissionType ===
                                    "Withdrawal Request" ? (
                                      <ArrowUpRight className="w-6 h-6" />
                                    ) : (
                                      <ArrowDownLeft className="w-6 h-6" />
                                    )}
                                  </div>

                                  <div>
                                    <p className="font-semibold text-gray-800">
                                      {transaction.commissionType ===
                                      "Withdrawal Request"
                                        ? "Bank Transfer Request"
                                        : `${
                                            transaction.customerName ||
                                            "Customer"
                                          } - ${formatCommissionType(
                                            transaction.commissionType
                                          )}`}
                                    </p>
                                    <div className="flex items-center space-x-2 text-gray-600 text-sm">
                                      <Calendar className="w-4 h-4" />
                                      <span>
                                        {moment(transaction.createdAt).format(
                                          "YYYY-MM-DD"
                                        )}
                                      </span>
                                      <Clock className="w-4 h-4" />
                                      <span>
                                        {moment(transaction.createdAt).format(
                                          "HH:mm"
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p
                                    className={`font-bold text-lg ${
                                      transaction.commissionType ===
                                      "Withdrawal Request"
                                        ? "text-red-600"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {transaction.commissionType ===
                                    "Withdrawal Request"
                                      ? "-"
                                      : "+"}
                                    {formatCurrency(
                                      Math.abs(transaction.commissionAmount)
                                    )}
                                  </p>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                      getStatusText(transaction)
                                    )}`}
                                  >
                                    {getStatusText(transaction)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === "settings" && renderSettingsContent()}{" "}
                {/* Render settings content */}
              </div>
            </main>
          </div>

          {/* Updated Mobile Bottom Navigation */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 z-50">
            <div className="flex justify-around items-center px-2 py-3">
              {/* Dashboard */}
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                  activeTab === "dashboard" ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <Home className="w-6 h-6" />
                <span className="text-xs font-medium">Dashboard</span>
              </button>

              {/* Customers */}
              <button
                onClick={() => setActiveTab("customers")}
                className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                  activeTab === "customers" ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <Users className="w-6 h-6" />
                <span className="text-xs font-medium">Customers</span>
              </button>

              {/* Transfer - Center Blue Circle Button (jaise image mein explore hai) */}
              <button
                onClick={handleRequestTransferClick} // Use the new handler
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-full shadow-lg transition-transform duration-200 hover:scale-105"
              >
                <ArrowUpRight className="w-6 h-6" />
              </button>

              {/* Wallet Amount */}
              <button
                onClick={() => setActiveTab("wallet")} // Changed to wallet tab
                className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                  activeTab === "wallet" ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <FaWallet className="w-5 h-5" />
                <span className="text-xs font-medium">
                  {walletBalance ? formatCurrency(walletBalance) : "₹0"}
                </span>
              </button>

              {/* Settings */}
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex flex-col items-center space-y-1 px-2 py-2 rounded-lg transition-all duration-200 ${
                  activeTab === "settings" ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <KeyRound className="w-6 h-6" />
                <span className="text-xs font-medium">Settings</span>
              </button>
            </div>
          </div>

          {/* Edit Customer Modal (Keep as is) */}
          {editingCustomer && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              {/* ... (existing code) */}
            </div>
          )}

          {/* Add New Customer Modal (Keep as is) */}
          {openAddCustomerModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              {/* ... (existing code) */}
            </div>
          )}

          {/* Withdrawal Request Modal (Modify) */}
          {showWithdrawalModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Request Withdrawal
                  </h3>
                  <button
                    onClick={() => setShowWithdrawalModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enter Amount (INR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., 500.00"
                    />
                  </div>

                  <div className="text-sm text-gray-600">
                    Available Balance:{" "}
                    <span className="font-semibold text-green-600">
                      {formatCurrency(walletBalance)}
                    </span>
                  </div>

                  {/* Conditional Bank Account Selection / Warning */}
                  {user?.bankAccounts?.length === 0 ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 font-semibold">
                      <p className="font-bold mb-1">Important Notice:</p>
                      <p>
                        If you wish to transfer money to your bank, please add
                        your bank account in the Settings page first.
                      </p>
                      <button
                        onClick={() => {
                          setShowWithdrawalModal(false);
                          setActiveTab("settings");
                          setActiveSettingSubTab("bankAccounts");
                        }}
                        className="mt-2 text-blue-600 hover:underline"
                      >
                        Add Bank Account
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Bank Account
                      </label>
                      <select
                        value={selectedBankAccountIndex}
                        onChange={(e) =>
                          setSelectedBankAccountIndex(e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      >
                        <option value="">-- Select an account --</option>
                        {user.bankAccounts.map((account, index) => (
                          <option key={account._id || index} value={index}>
                            {account.bankName} - {account.bankAccountNumber} (
                            {account.accountHolderName})
                            {account.upiId && ` (UPI: ${account.upiId})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {user?.bankAccounts?.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                      <p className="font-semibold mb-1">
                        Important Notification:
                      </p>
                      <ul className="list-disc list-inside">
                        <li>
                          Withdrawal requests are processed within 24-48
                          business hours.
                        </li>
                        <li>
                          Ensure your bank account details are accurate to avoid
                          delays.
                        </li>
                        <li>Minimum withdrawal amount is INR 100.</li>
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowWithdrawalModal(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                      disabled={isRequestingWithdrawal}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleWithdrawalRequest}
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      disabled={
                        isRequestingWithdrawal ||
                        user?.bankAccounts?.length === 0
                      }
                    >
                      {isRequestingWithdrawal ? "Processing..." : "Proceed"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

           {/* KYC Pending/Rejected Popup (Modified) */}
            {showKycPendingPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4 shadow-lg text-center">
                    <FileText className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {kycStatusData?.kycStatus === "rejected"
                        ? "KYC Rejected!"
                        : "KYC Pending!"}
                    </h3>
                    <p className="text-gray-700 mb-6">
                    {kycStatusData?.kycStatus === "rejected"
                        ? `Your previous KYC submission was rejected. Reason(s): ${kycStatusData.kycRejectionReasons.join(
                            ", "
                        )}. Please resubmit.`
                        : "To transfer money to your bank, please complete your KYC in the Settings page first."}
                    </p>
                    <button
                    onClick={() => {
                        setShowKycPendingPopup(false);
                        setActiveTab("settings");
                        setActiveSettingSubTab("kyc");
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                    {kycStatusData?.kycStatus === "rejected"
                        ? "Resubmit KYC"
                        : "Complete KYC"}
                    </button>
                </div>
                </div>
            )}

          {/* Add Bank Account Modal (New) */}
          {showAddBankAccountModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Add New Bank Account
                  </h3>
                  <button
                    onClick={() => setShowAddBankAccountModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    &times;
                  </button>
                </div>
                <form onSubmit={handleAddBankAccount} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBankAccount.bankName}
                      onChange={(e) =>
                        setNewBankAccount((prev) => ({
                          ...prev,
                          bankName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBankAccount.bankAccountNumber}
                      onChange={(e) =>
                        setNewBankAccount((prev) => ({
                          ...prev,
                          bankAccountNumber: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IFSC Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBankAccount.bankIFSCCode}
                      onChange={(e) =>
                        setNewBankAccount((prev) => ({
                          ...prev,
                          bankIFSCCode: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBankAccount.accountHolderName}
                      onChange={(e) =>
                        setNewBankAccount((prev) => ({
                          ...prev,
                          accountHolderName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={newBankAccount.upiId}
                      onChange={(e) =>
                        setNewBankAccount((prev) => ({
                          ...prev,
                          upiId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      QR Code (JPG/JPEG, Optional)
                    </label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg"
                      onChange={(e) => handleBankQrUpload(e.target.files[0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    {newBankAccount.qrCode && (
                      <img
                        src={newBankAccount.qrCode}
                        alt="QR Preview"
                        className="mt-2 h-24 w-24 object-cover rounded"
                      />
                    )}
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={newBankAccount.isPrimary}
                      onChange={(e) =>
                        setNewBankAccount((prev) => ({
                          ...prev,
                          isPrimary: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="isPrimary"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Set as Primary Account
                    </label>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddBankAccountModal(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                      disabled={isAddingBankAccount}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                      disabled={isAddingBankAccount}
                    >
                      {isAddingBankAccount ? "Adding..." : "Add Account"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Change Password Modal (New) */}
          {showPasswordChangeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Change Password
                  </h3>
                  <button
                    onClick={() => setShowPasswordChangeModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    &times;
                  </button>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordFormData.currentPassword}
                      onChange={(e) =>
                        setPasswordFormData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordFormData.newPassword}
                      onChange={(e) =>
                        setPasswordFormData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordFormData.confirmNewPassword}
                      onChange={(e) =>
                        setPasswordFormData((prev) => ({
                          ...prev,
                          confirmNewPassword: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowPasswordChangeModal(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                      disabled={isChangingPassword}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? "Changing..." : "Change Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Transaction Detail Modal (Keep as is) */}
          {showTransactionDetailModal && selectedTransactionDetail && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedTransactionDetail.commissionType ===
                      "Withdrawal Request"
                        ? "Withdrawal Request Details"
                        : "Commission Details"}
                    </h3>
                    <button
                      onClick={() => {
                        setShowTransactionDetailModal(false);
                        setSelectedTransactionDetail(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-4">
                  {selectedTransactionDetail.commissionType ===
                  "Withdrawal Request" ? (
                    // Withdrawal Request Details
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Type</p>
                          <p className="font-semibold">Withdrawal Request</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Amount</p>
                          <p className="font-semibold text-red-600">
                            {formatCurrency(
                              Math.abs(
                                selectedTransactionDetail.commissionAmount
                              )
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <p
                            className={`font-semibold ${getStatusColor(
                              selectedTransactionDetail.status
                            )}`}
                          >
                            {selectedTransactionDetail.status
                              ?.charAt(0)
                              .toUpperCase() +
                              selectedTransactionDetail.status?.slice(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Requested At</p>
                          <p className="font-semibold">
                            {moment(selectedTransactionDetail.createdAt).format(
                              "MMM DD, YYYY hh:mm A"
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Bank Account Details - यह data backend से आना चाहिए */}
                      {selectedTransactionDetail.selectedBankAccount && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Bank Account Details:
                          </h4>
                          <div className="text-sm space-y-1">
                            <p>
                              <strong>Bank:</strong>{" "}
                              {
                                selectedTransactionDetail.selectedBankAccount
                                  .bankName
                              }
                            </p>
                            <p>
                              <strong>Account No:</strong>{" "}
                              {
                                selectedTransactionDetail.selectedBankAccount
                                  .bankAccountNumber
                              }
                            </p>
                            <p>
                              <strong>IFSC:</strong>{" "}
                              {
                                selectedTransactionDetail.selectedBankAccount
                                  .bankIFSCCode
                              }
                            </p>
                            <p>
                              <strong>Account Holder:</strong>{" "}
                              {
                                selectedTransactionDetail.selectedBankAccount
                                  .accountHolderName
                              }
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Admin Response Details */}
                      {selectedTransactionDetail.status === "approved" &&
                        selectedTransactionDetail.adminResponse && (
                          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="font-semibold text-gray-900 mb-2">
                              Approval Details:
                            </h4>
                            <div className="text-sm space-y-1">
                              <p>
                                <strong>Approved By:</strong> Admin
                              </p>
                              <p>
                                <strong>Payment Mode:</strong>{" "}
                                {
                                  selectedTransactionDetail.adminResponse
                                    .paymentMode
                                }
                              </p>
                              <p>
                                <strong>Transaction ID:</strong>{" "}
                                {
                                  selectedTransactionDetail.adminResponse
                                    .transactionId
                                }
                              </p>
                              <p>
                                <strong>Processed At:</strong>{" "}
                                {moment(
                                  selectedTransactionDetail.adminResponse
                                    .processedAt
                                ).format("MMM DD, YYYY hh:mm A")}
                              </p>
                            </div>
                          </div>
                        )}

                      {selectedTransactionDetail.status === "rejected" &&
                        selectedTransactionDetail.adminResponse && (
                          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                            <h4 className="font-semibold text-gray-900 mb-2">
                              Rejection Details:
                            </h4>
                            <div className="text-sm space-y-1">
                              <p>
                                <strong>Rejected By:</strong> Admin
                              </p>
                              <p>
                                <strong>Reason:</strong>{" "}
                                {
                                  selectedTransactionDetail.adminResponse
                                    .rejectionReason
                                }
                              </p>
                              <p>
                                <strong>Rejected At:</strong>{" "}
                                {moment(
                                  selectedTransactionDetail.adminResponse
                                    .processedAt
                                ).format("MMM DD, YYYY hh:mm A")}
                              </p>
                            </div>
                          </div>
                        )}
                    </>
                  ) : (
                    // Commission Details
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Customer Name</p>
                          <p className="font-semibold">
                            {selectedTransactionDetail.customerName}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Commission Type
                          </p>
                          <p className="font-semibold">
                            {formatCommissionType(
                              selectedTransactionDetail.commissionType
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Date & Time</p>
                          <p className="font-semibold">
                            {moment(selectedTransactionDetail.createdAt).format(
                              "MMM DD, YYYY hh:mm A"
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Amount Credited
                          </p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(
                              selectedTransactionDetail.commissionAmount
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Customer Contact Details */}
                      {selectedTransactionDetail.customerId && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Customer Contact:
                          </h4>
                          <div className="text-sm space-y-1">
                            <p>
                              <strong>Email:</strong>{" "}
                              {selectedTransactionDetail.customerId.email ||
                                "N/A"}
                            </p>
                            <p>
                              <strong>Phone:</strong>{" "}
                              {selectedTransactionDetail.customerId.phone ||
                                "N/A"}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">
                            Commission Rate
                          </p>
                          <p className="font-semibold">
                            {selectedTransactionDetail.commissionRate
                              ? `${(
                                  selectedTransactionDetail.commissionRate * 100
                                ).toFixed(0)}%`
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Order Amount</p>
                          <p className="font-semibold">
                            {selectedTransactionDetail.orderAmount
                              ? formatCurrency(
                                  selectedTransactionDetail.orderAmount
                                )
                              : "N/A"}
                          </p>
                        </div>
                      </div>

                      {selectedTransactionDetail.serviceName && (
                        <div>
                          <p className="text-sm text-gray-600">Service Name</p>
                          <p className="font-semibold">
                            {selectedTransactionDetail.serviceName}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PartnerDashboard;
