import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- آیکون‌ها ---
import { Home, Users, ClipboardList, User, Mail, Lock, FileText, CreditCard, LogOut, CheckCircle, Store, ShoppingCart, Shield, Edit, Save, XCircle, ArrowLeft, X as XIcon, PlusCircle, Building, Square, FileSignature, Zap, Target, BarChart2, DollarSign, Settings, LayoutDashboard, TrendingUp, History, Menu, Trash2, UserCheck, Calendar, AlertTriangle } from 'lucide-react';

// --- ۱. Context برای مدیریت احراز هویت ---
const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

// --- ۲. کامپوننت اصلی فراهم‌کننده اطلاعات ---
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [demoInfo, setDemoInfo] = useState(null);

  useEffect(() => {
    const firebaseConfig = {
      apiKey: "AIzaSyBRtsKWqpXK-Fl0xitQEctJ01DT6KmXGyo",
      authDomain: "amlawk-f6f0d.firebaseapp.com",
      projectId: "amlawk-f6f0d",
      storageBucket: "amlawk-f6f0d.firebasestorage.app",
      messagingSenderId: "490454242661",
      appId: "1:490454242661:web:3404be6027a4375b9dbd8c",
      measurementId: "G-XLDZ0PM0P7"
    };

    try {
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);
      setAuth(authInstance);
      setDb(dbInstance);

      const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setUserId(currentUser.uid);
          const userDocRef = doc(dbInstance, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          
          if (docSnap.exists()) {
            setUserRole(docSnap.data().role);
          } else {
            setUserRole(null);
          }
          setIsDemo(false);
        } else {
          setUser(null);
          setUserId(null);
          setUserRole(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      setError("خطای سیستمی در اتصال به Firebase.");
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
      setLoading(true);
      setError('');
      try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const loggedInUser = userCredential.user;
          
          await addDoc(collection(db, 'activity_logs'), {
              userId: loggedInUser.uid,
              userEmail: loggedInUser.email,
              action: 'login',
              timestamp: serverTimestamp()
          });

          const userDocRef = doc(db, 'users', loggedInUser.uid);
          await updateDoc(userDocRef, {
              lastLogin: serverTimestamp()
          });

      } catch(err) {
          setError('ایمیل یا رمز عبور اشتباه است.');
      } finally {
          setLoading(false);
      }
  };

  const logout = async () => {
    if (auth.currentUser && db) {
        try {
            await addDoc(collection(db, 'activity_logs'), {
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                action: 'logout',
                timestamp: serverTimestamp()
            });
        } catch (logError) {
            console.error("Error logging out activity:", logError);
        }
    }
    await signOut(auth);
    setIsDemo(false);
    setDemoInfo(null);
  };
  
  const register = async (email, password, role) => {
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      await setDoc(doc(db, 'users', newUser.uid), {
        email: newUser.email,
        role: role,
        createdAt: serverTimestamp(),
        fullName: '',
        phoneNumber: '',
        job: '',
        location: ''
      });
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
            setError('این ایمیل قبلا استفاده شده است.');
        } else {
            setError('خطا در ثبت نام. لطفا دوباره تلاش کنید.');
            console.error("Registration Error:", err);
        }
    } finally {
      setLoading(false);
    }
  };
  
  const resetPassword = async (email) => {
      if (!auth) return { success: false, error: 'سرویس احراز هویت آماده نیست.' };
      try {
          await sendPasswordResetEmail(auth, email);
          return { success: true };
      } catch (err) {
          return { success: false, error: 'خطا در ارسال ایمیل بازیابی.' };
      }
  };

  const startDemo = async (phoneNumber, role) => {
    setLoading(true);
    setError('');
    try {
      if (db) await addDoc(collection(db, "demo_leads"), { phoneNumber, role, timestamp: serverTimestamp() });
    } catch (err) {
      console.error("Could not save demo lead:", err);
    } finally {
      setDemoInfo({ phoneNumber, role });
      setIsDemo(true);
      setLoading(false);
    }
  };

  const endDemo = () => {
    setIsDemo(false);
    setDemoInfo(null);
  };

  const value = { user, userId, userRole, loading, error, register, login, logout, resetPassword, db, auth, isDemo, demoInfo, startDemo, endDemo };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// --- کامپوننت‌های UI ---

function RoleSelector({ selectedRole, setSelectedRole, disabled }) {
  const roles = [
    { value: 'landlord', label: 'موجر', icon: Home, color: 'indigo' },
    { value: 'tenant', label: 'مستأجر', icon: Users, color: 'green' },
    { value: 'seller', label: 'فروشنده', icon: Store, color: 'purple' },
    { value: 'buyer', label: 'خریدار', icon: ShoppingCart, color: 'yellow' },
  ];

  const colorClasses = {
    indigo: { border: 'border-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    green: { border: 'border-green-600', bg: 'bg-green-50', text: 'text-green-600' },
    purple: { border: 'border-purple-600', bg: 'bg-purple-50', text: 'text-purple-600' },
    yellow: { border: 'border-yellow-600', bg: 'bg-yellow-50', text: 'text-yellow-600' },
  };

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {roles.map((role) => {
        const currentColors = colorClasses[role.color];
        const isSelected = selectedRole === role.value;
        return (
            <label key={role.value} className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all w-[calc(50%-0.375rem)] sm:w-[calc(25%-0.5625rem)] ${isSelected ? `${currentColors.border} ${currentColors.bg} shadow-md` : 'border-gray-300 hover:border-gray-400 bg-gray-50'} ${disabled ? 'opacity-60 ' : 'cursor-pointer'}`}>
              <input type="radio" className="hidden" name="role" value={role.value} checked={isSelected} onChange={(e) => setSelectedRole(e.target.value)} disabled={disabled}/>
              {React.createElement(role.icon, { className: `w-6 h-6 ${currentColors.text} mb-1` })}
              <span className="text-sm font-medium text-gray-800">{role.label}</span>
              {isSelected && <CheckCircle className={`w-4 h-4 ${currentColors.text} mt-1`} />}
            </label>
        );
      })}
    </div>
  );
}

function AuthForm() {
  const [authFlowState, setAuthFlowState] = useState('quick-login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState('landlord');
  const { register, login, resetPassword, startDemo, loading, error: authError } = useAuth();
  const [message, setMessage] = useState('');

  const handleMainSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (authFlowState === 'register') await register(email, password, selectedRole);
    else if (authFlowState === 'login') await login(email, password, selectedRole);
    else if (authFlowState === 'quick-login') await startDemo(phoneNumber, selectedRole);
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const result = await resetPassword(email);
    setMessage(result.success ? 'ایمیل بازیابی رمز عبور با موفقیت ارسال شد.' : result.error);
  };
  
  const renderTabs = () => (
      <div className="flex border-b mb-6">
          <button onClick={() => setAuthFlowState('quick-login')} className={`flex-1 py-2 font-semibold ${authFlowState === 'quick-login' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}>ورود سریع</button>
          <button onClick={() => setAuthFlowState('login')} className={`flex-1 py-2 font-semibold ${authFlowState === 'login' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>ورود</button>
          <button onClick={() => setAuthFlowState('register')} className={`flex-1 py-2 font-semibold ${authFlowState === 'register' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>ثبت نام</button>
      </div>
  );

  const renderContent = () => {
    if (authFlowState === 'forgotPassword') {
          return (
            <>
              <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">بازیابی رمز عبور</h2>
              {message && <div className={`p-3 rounded-lg mb-4 text-sm ${message.includes('موفقیت') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{message}</div>}
              <form onSubmit={handlePasswordResetSubmit} className="space-y-6">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">ایمیل ثبت شده:</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition" disabled={loading}>{loading ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}</button>
              </form>
              <p className="text-center text-sm text-gray-600 mt-6">
                <button onClick={() => { setAuthFlowState('login'); setMessage(''); }} className="text-indigo-600 font-semibold hover:underline">بازگشت به صفحه ورود</button>
              </p>
            </>
          );
    }
    
    const isQuickLoginFlow = authFlowState === 'quick-login';
    return (
      <>
        {renderTabs()}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
            {isQuickLoginFlow ? 'ورود سریع' : (authFlowState === 'register' ? 'ایجاد حساب کاربری' : 'ورود به حساب')}
        </h2>
        {authError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 text-sm" role="alert">{authError}</div>}
        <form onSubmit={handleMainSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">نقش خود را انتخاب کنید:</label>
            <RoleSelector selectedRole={selectedRole} setSelectedRole={setSelectedRole} disabled={loading}/>
          </div>
          {isQuickLoginFlow ? (
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">شماره موبایل:</label>
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full px-4 py-2 border rounded-lg" required placeholder="مثال: 09123456789" />
              </div>
          ) : (
            <>
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">ایمیل:</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">رمز عبور:</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg" required />
              </div>
            </>
          )}
          {authFlowState === 'login' && (
              <div className="text-right">
                  <button type="button" onClick={() => { setAuthFlowState('forgotPassword'); setMessage(''); }} className="text-sm text-indigo-600 hover:underline">فراموشی رمز عبور</button>
              </div>
          )}
          <button type="submit" className={`w-full text-white font-bold py-3 rounded-lg transition ${isQuickLoginFlow ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`} disabled={loading}>
            {loading ? 'در حال پردازش...' : (isQuickLoginFlow ? 'ورود سریع' : (authFlowState === 'register' ? 'ثبت نام' : 'ورود'))}
          </button>
        </form>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        {renderContent()}
      </div>
    </div>
  );
}

// --- کامپوننت‌های عمومی و ابزارها ---

function AddPropertyModal({ isOpen, onClose, userId, db }) {
    const [propertyType, setPropertyType] = useState('apartment');
    const [address, setAddress] = useState('');
    const [area, setArea] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleClose = () => {
        // Reset state before closing
        setError('');
        setSuccess('');
        setAddress('');
        setArea('');
        setDescription('');
        onClose();
    };

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        setSuccess('');

        if (!address || !area) {
            setError('لطفاً آدرس و متراژ را وارد کنید.');
            setIsSaving(false);
            return;
        }

        try {
            await addDoc(collection(db, 'properties'), {
                userId,
                propertyType,
                address,
                area: Number(area),
                description,
                createdAt: serverTimestamp(),
            });
            setSuccess('ملک با موفقیت ثبت شد! این پنجره به زودی بسته می‌شود.');
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (err) {
            setError('خطا در ثبت ملک. لطفا اتصال خود را بررسی کرده و دوباره تلاش کنید.');
            console.error("Error adding property: ", err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative">
                <button onClick={handleClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><XIcon size={24}/></button>
                <h2 className="text-xl font-bold mb-4 flex items-center"><PlusCircle className="w-6 h-6 ml-2 text-indigo-600"/>ثبت ملک جدید</h2>
                <form onSubmit={handleSave} className="space-y-4">
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
                    {success && <div className="bg-green-100 text-green-700 p-3 rounded-lg text-sm">{success}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">نوع ملک</label>
                        <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="mt-1 w-full p-2 border rounded-md">
                            <option value="apartment">آپارتمان</option>
                            <option value="villa">ویلا</option>
                            <option value="store">مغازه</option>
                            <option value="land">زمین</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">آدرس *</label>
                        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">متراژ (متر مربع) *</label>
                        <input type="number" value={area} onChange={(e) => setArea(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">توضیحات</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="mt-1 w-full p-2 border rounded-md"></textarea>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleClose} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300">انصراف</button>
                        <button type="submit" disabled={isSaving || !!success} className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {isSaving ? 'در حال ذخیره...' : 'ذخیره ملک'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-right flex-grow">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">{message}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:w-auto sm:text-sm"
                        onClick={onConfirm}
                    >
                        حذف
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        انصراف
                    </button>
                </div>
            </div>
        </div>
    );
}


// --- صفحات اصلی برنامه ---

function ProfileAndPropertiesPage({ managedUser = null }) {
    const { db, userId: loggedInUserId, userRole: loggedInUserRole } = useAuth();
    const [profile, setProfile] = useState(null);
    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isAsminManaging = managedUser && loggedInUserRole === 'admin';
    const targetUserId = isAsminManaging ? managedUser.id : loggedInUserId;

    useEffect(() => {
        if (!targetUserId || !db) return;

        const docRef = doc(db, 'users', targetUserId);
        const unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setProfile({ id: docSnap.id, ...docSnap.data() });
            } else {
                setError('پروفایل یافت نشد.');
            }
        });
        
        const q = query(collection(db, "properties"), where("userId", "==", targetUserId));
        const unsubscribeProperties = onSnapshot(q, (querySnapshot) => {
            const props = [];
            querySnapshot.forEach((doc) => {
                props.push({ id: doc.id, ...doc.data() });
            });
            setProperties(props);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching properties:", err);
            setError("خطا در دریافت لیست املاک.");
            setIsLoading(false);
        });
        
        return () => {
            unsubscribeProfile();
            unsubscribeProperties();
        };

    }, [targetUserId, db]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');
        try {
            const userRef = doc(db, 'users', targetUserId);
            await updateDoc(userRef, {
                fullName: profile.fullName || '',
                phoneNumber: profile.phoneNumber || '',
                job: profile.job || '',
                location: profile.location || '',
            });
            setSuccess('پروفایل با موفقیت بروزرسانی شد.');
            setIsEditing(false);
        } catch (err) {
            setError('خطا در ذخیره اطلاعات.');
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-600">در حال بارگذاری کارتابل...</div>;

    return (
        <>
            <AddPropertyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} userId={targetUserId} db={db} />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                    <User className="mr-3 w-7 h-7 text-indigo-600"/>
                    کارتابل کاربری {isAsminManaging ? `(مدیریت ${profile?.email || ''})` : ''}
                </h1>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
            {success && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm">{success}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-6 h-fit">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">اطلاعات شخصی</h2>
                    {profile ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600">نام کامل</label>
                                <input type="text" name="fullName" value={profile.fullName || ''} onChange={handleInputChange} disabled={!isEditing} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">شماره تلفن</label>
                                <input type="text" name="phoneNumber" value={profile.phoneNumber || ''} onChange={handleInputChange} disabled={!isEditing} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">شغل</label>
                                <input type="text" name="job" value={profile.job || ''} onChange={handleInputChange} disabled={!isEditing} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">محل سکونت</label>
                                <input type="text" name="location" value={profile.location || ''} onChange={handleInputChange} disabled={!isEditing} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100"/>
                            </div>
                        </div>
                    ) : <p>اطلاعات پروفایل در دسترس نیست.</p>}
                    <div className="mt-6 flex flex-wrap gap-3">
                        {isEditing ? (
                            <>
                                <button onClick={handleSave} className="bg-green-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-green-700 transition"><Save className="w-5 h-5 ml-2"/>ذخیره</button>
                                <button onClick={() => setIsEditing(false)} className="bg-gray-500 text-white py-2 px-4 rounded-lg flex items-center hover:bg-gray-600 transition"><XCircle className="w-5 h-5 ml-2"/>انصراف</button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="bg-indigo-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-indigo-700 transition"><Edit className="w-5 h-5 ml-2"/>ویرایش پروفایل</button>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                       <h2 className="text-lg font-bold text-gray-800">املاک من</h2>
                       <button onClick={() => setIsModalOpen(true)} className="bg-indigo-100 text-indigo-700 py-2 px-4 rounded-lg flex items-center hover:bg-indigo-200 transition text-sm font-semibold">
                           <PlusCircle className="w-5 h-5 ml-2"/> ثبت ملک جدید
                       </button>
                    </div>
                    <div className="space-y-4">
                        {properties.length > 0 ? (
                            properties.map(prop => (
                                <div key={prop.id} className="border rounded-lg p-4 bg-gray-50">
                                    <h3 className="font-bold text-gray-800 flex items-center"><Building className="w-5 h-5 ml-2 text-gray-500"/>{prop.address}</h3>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                                        <span className="flex items-center"><FileText className="w-4 h-4 ml-1"/>نوع: {prop.propertyType}</span>
                                        <span className="flex items-center"><Square className="w-4 h-4 ml-1"/>متراژ: {prop.area} متر</span>
                                    </div>
                                    {prop.description && <p className="text-sm text-gray-500 mt-2">{prop.description}</p>}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">هنوز ملکی ثبت نشده است.</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function AdminDashboard({ onManageUser }) {
  const { db } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminView, setAdminView] = useState('users');

  useEffect(() => {
    if (adminView !== 'users' || !db) return;
    setIsLoading(true);
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const usersData = [];
        querySnapshot.forEach((doc) => {
            usersData.push({ id: doc.id, ...doc.data() });
        });
        setUsers(usersData);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, adminView]);
  
  const LeadsTable = ({ db }) => {
    const [leads, setLeads] = useState([]);
    const [isLoadingLeads, setIsLoadingLeads] = useState(true);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, "demo_leads"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const leadsData = [];
            querySnapshot.forEach((doc) => {
                leadsData.push({ id: doc.id, ...doc.data() });
            });
            setLeads(leadsData);
            setIsLoadingLeads(false);
        });
        return () => unsubscribe();
    }, [db]);

    if (isLoadingLeads) return <p className="text-center py-8 text-gray-500">در حال بارگذاری سرنخ‌ها...</p>;

    return (
        <div className="overflow-x-auto mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Target className="w-6 h-6 ml-2 text-green-600"/>سرنخ‌های ورود سریع</h3>
            {leads.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره موبایل</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نقش انتخابی</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {leads.map(lead => (
                            <tr key={lead.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{lead.phoneNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{lead.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {lead.timestamp?.toDate().toLocaleString('fa-IR')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-center text-gray-500 py-8">هنوز هیچ سرنخی ثبت نشده است.</p>
            )}
        </div>
    );
  }
  
  const ActivityLogTable = ({ db }) => {
    const [logs, setLogs] = useState([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const logsData = [];
            querySnapshot.forEach((doc) => {
                logsData.push({ id: doc.id, ...doc.data() });
            });
            setLogs(logsData);
            setIsLoadingLogs(false);
        });
        return () => unsubscribe();
    }, [db]);

    if (isLoadingLogs) return <p className="text-center py-8 text-gray-500">در حال بارگذاری گزارش فعالیت...</p>;

    return (
        <div className="overflow-x-auto mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><History className="w-6 h-6 ml-2 text-purple-600"/>گزارش فعالیت کاربران</h3>
            {logs.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کاربر</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">زمان</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{log.userEmail}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.action === 'login' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {log.action === 'login' ? 'ورود' : 'خروج'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {log.timestamp?.toDate().toLocaleString('fa-IR')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-center text-gray-500 py-8">هنوز هیچ فعالیتی ثبت نشده است.</p>
            )}
        </div>
    );
  }

  return (
    <>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center"><Shield className="mr-3 w-7 h-7 text-red-600"/>پنل مدیریت</h1>
        </div>
        
        <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                <button onClick={() => setAdminView('users')} className={`${adminView === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                    مدیریت کاربران
                </button>
                <button onClick={() => setAdminView('leads')} className={`${adminView === 'leads' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                    سرنخ‌های فروش
                </button>
                 <button onClick={() => setAdminView('logs')} className={`${adminView === 'logs' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                    گزارش فعالیت
                </button>
            </nav>
        </div>

        {adminView === 'users' ? (
            isLoading ? <p className="text-center py-8 text-gray-500">در حال بارگذاری کاربران...</p> : (
              <div className="overflow-x-auto mt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Users className="w-6 h-6 ml-2 text-indigo-600"/>لیست کاربران ثبت شده</h3>
                {users.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ایمیل</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نقش</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">آخرین ورود</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{u.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{u.role || 'کاربر'}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.lastLogin?.toDate().toLocaleString('fa-IR') || '---'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button onClick={() => onManageUser(u)} className="text-indigo-600 hover:text-indigo-900">مدیریت کاربر</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                ) : (
                    <p className="text-center text-gray-500 py-8">هیچ کاربری ثبت نام نکرده است.</p>
                )}
              </div>
            )
        ) : adminView === 'leads' ? (
            <LeadsTable db={db} />
        ) : (
            <ActivityLogTable db={db} />
        )}
    </>
  );
}

function PropertyAnalyticsDashboard({ properties, onAddProperty, isDemo = false, onRegisterClick }) {
    const [paidMonths, setPaidMonths] = useState([]);
    const [monthInput, setMonthInput] = useState('1');
    const totalMonths = 12;

    const handleAddPayment = () => {
        if (isDemo) {
            onRegisterClick();
            return;
        }
        const monthNumber = parseInt(monthInput, 10);
        if (!paidMonths.includes(monthNumber)) {
            setPaidMonths(prev => [...prev, monthNumber].sort((a,b) => a-b));
        }
    };

    const keyMetrics = {
        totalProperties: properties.length,
        paidMonthsCount: paidMonths.length,
        openRequests: properties.filter(p => p.status === 'open_request').length || 0,
    };

    const rentStatusData = [
        { name: 'پرداخت شده', value: keyMetrics.paidMonthsCount, color: '#10B981' },
        { name: 'باقیمانده', value: totalMonths - keyMetrics.paidMonthsCount, color: '#EF4444' },
    ];

    const propertyTypeData = properties.reduce((acc, property) => {
        const type = property.propertyType || 'نامشخص';
        const existingType = acc.find(item => item.name === type);
        if (existingType) {
            existingType['تعداد'] += 1;
        } else {
            acc.push({ name: type, 'تعداد': 1 });
        }
        return acc;
    }, []);
    
    const propertyTypeColors = {
        apartment: '#8884d8',
        villa: '#82ca9d',
        store: '#ffc658',
        land: '#ff8042',
        'نامشخص': '#d1d5db',
    };


    return (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><BarChart2 className="w-6 h-6 ml-2 text-indigo-600"/>نمای کلی مدیریت املاک</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg flex items-center">
                    <div className="bg-indigo-100 p-3 rounded-full mr-4"><Building className="w-6 h-6 text-indigo-600"/></div>
                    <div>
                        <p className="text-sm text-gray-500">کل املاک</p>
                        <p className="text-2xl font-bold text-gray-800">{keyMetrics.totalProperties}</p>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg flex items-center">
                    <div className="bg-green-100 p-3 rounded-full mr-4"><TrendingUp className="w-6 h-6 text-green-600"/></div>
                    <div>
                        <p className="text-sm text-gray-500">ماه‌های پرداخت شده</p>
                        <p className="text-2xl font-bold text-gray-800">{`${keyMetrics.paidMonthsCount} از ${totalMonths}`}</p>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg flex items-center">
                    <div className="bg-yellow-100 p-3 rounded-full mr-4"><ClipboardList className="w-6 h-6 text-yellow-600"/></div>
                    <div>
                        <p className="text-sm text-gray-500">درخواست‌های باز</p>
                        <p className="text-2xl font-bold text-gray-800">{keyMetrics.openRequests}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="font-bold text-center mb-2">وضعیت پرداخت قرارداد (۱۲ ماهه)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={rentStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {rentStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} ماه`}/>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 flex items-center justify-center gap-2">
                        <select value={monthInput} onChange={e => setMonthInput(e.target.value)} className="p-2 border rounded-md text-sm" disabled={isDemo}>
                           {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                               <option key={month} value={month} disabled={paidMonths.includes(month)}>
                                   {`ماه ${month}`} {paidMonths.includes(month) ? ' (پرداخت شده)' : ''}
                                </option>
                           ))}
                        </select>
                        <button onClick={handleAddPayment} disabled={isDemo} className="bg-green-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed">ثبت پرداخت</button>
                    </div>
                </div>
                <div>
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="font-bold text-center">ترکیب املاک</h3>
                        <button onClick={onAddProperty} className="mr-2 p-1 hover:bg-gray-200 rounded-full disabled:cursor-not-allowed" disabled={isDemo} title="افزودن ملک جدید"><PlusCircle className="w-5 h-5 text-indigo-600"/></button>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={propertyTypeData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis type="category" dataKey="name" width={60} />
                            <Tooltip formatter={(value) => `${value} ملک`}/>
                            <Bar dataKey="تعداد" barSize={30}>
                                {propertyTypeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={propertyTypeColors[entry.name.toLowerCase()] || '#d1d5db'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function AddContractModal({ isOpen, onClose, db, userId, userEmail, userRole, properties }) {
    const [contractType, setContractType] = useState('rent');
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [otherPartyEmail, setOtherPartyEmail] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [amount, setAmount] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (properties.length > 0 && !selectedPropertyId) {
            setSelectedPropertyId(properties[0].id);
        }
    }, [properties, selectedPropertyId]);
    
    const handleClose = () => {
        setError('');
        setSuccess('');
        setOtherPartyEmail('');
        setStartDate('');
        setEndDate('');
        setAmount('');
        onClose();
    };


    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!selectedPropertyId || !otherPartyEmail || !startDate || !amount) {
            setError('لطفاً تمام فیلدهای ستاره‌دار را پر کنید.');
            return;
        }
        setIsSaving(true);

        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", otherPartyEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError('کاربری با این ایمیل یافت نشد.');
                setIsSaving(false);
                return;
            }
            
            const otherPartyDoc = querySnapshot.docs[0];
            const otherPartyData = { id: otherPartyDoc.id, ...otherPartyDoc.data() };

            const selectedProperty = properties.find(p => p.id === selectedPropertyId);

            const newContract = {
                propertyId: selectedProperty.id,
                propertyAddress: selectedProperty.address,
                contractType,
                parties: [userId, otherPartyData.id],
                partyInfo: [
                    { userId: userId, email: userEmail, role: contractType === 'rent' ? 'landlord' : 'seller' },
                    { userId: otherPartyData.id, email: otherPartyData.email, role: contractType === 'rent' ? 'tenant' : 'buyer' }
                ],
                startDate,
                status: 'active',
                createdAt: serverTimestamp(),
            };

            if (contractType === 'rent') {
                newContract.endDate = endDate;
                newContract.rentAmount = Number(amount);
            } else {
                newContract.salePrice = Number(amount);
            }

            await addDoc(collection(db, 'contracts'), newContract);
            setSuccess('قرارداد با موفقیت ایجاد شد!');
            setTimeout(() => {
                handleClose();
            }, 2000);

        } catch (err) {
            console.error("Error creating contract:", err);
            setError('خطا در ایجاد قرارداد. لطفاً دوباره تلاش کنید.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative">
                <button onClick={handleClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><XIcon size={24}/></button>
                <h2 className="text-xl font-bold mb-4 flex items-center"><PlusCircle className="w-6 h-6 ml-2 text-green-600"/>ایجاد قرارداد جدید</h2>
                <form onSubmit={handleSave} className="space-y-4">
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
                    {success && <div className="bg-green-100 text-green-700 p-3 rounded-lg text-sm">{success}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">نوع قرارداد *</label>
                        <select value={contractType} onChange={(e) => setContractType(e.target.value)} className="mt-1 w-full p-2 border rounded-md">
                            <option value="rent">اجاره</option>
                            <option value="sale">فروش</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">انتخاب ملک *</label>
                        <select value={selectedPropertyId} onChange={(e) => setSelectedPropertyId(e.target.value)} required className="mt-1 w-full p-2 border rounded-md">
                           {properties.length > 0 ? properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>) : <option disabled>ابتدا یک ملک ثبت کنید</option>}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ایمیل طرف دوم قرارداد *</label>
                        <input type="email" value={otherPartyEmail} onChange={(e) => setOtherPartyEmail(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" placeholder="email@example.com"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">تاریخ شروع *</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/>
                        </div>
                        {contractType === 'rent' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">تاریخ پایان</label>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                        )}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">{contractType === 'rent' ? 'مبلغ اجاره (ماهانه)' : 'مبلغ کل فروش'} *</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1 w-full p-2 border rounded-md" placeholder="به تومان"/>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={handleClose} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300">انصراف</button>
                        <button type="submit" disabled={isSaving || !!success || properties.length === 0} className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50">
                            {isSaving ? 'در حال ذخیره...' : 'ایجاد قرارداد'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ContractsPage() {
    const { db, userId, user, userRole } = useAuth();
    const [contracts, setContracts] = useState([]);
    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [contractToDelete, setContractToDelete] = useState(null);
    
    useEffect(() => {
        if (!userId || !db) return;

        const q = query(collection(db, "contracts"), where("parties", "array-contains", userId));
        const unsubscribeContracts = onSnapshot(q, (snapshot) => {
            const contractsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setContracts(contractsData);
            setIsLoading(false);
        });

        const propsQuery = query(collection(db, "properties"), where("userId", "==", userId));
        const unsubscribeProps = onSnapshot(propsQuery, (snapshot) => {
            const propsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProperties(propsData);
        });

        return () => {
            unsubscribeContracts();
            unsubscribeProps();
        };
    }, [userId, db]);

    const handleDeleteRequest = (contractId) => {
        setContractToDelete(contractId);
        setIsConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (contractToDelete) {
            try {
                await deleteDoc(doc(db, 'contracts', contractToDelete));
            } catch (error) {
                console.error("Error deleting contract: ", error);
            } finally {
                setIsConfirmModalOpen(false);
                setContractToDelete(null);
            }
        }
    };

    if (isLoading) return <p className="p-8 text-center text-gray-600">در حال بارگذاری قراردادها...</p>;

    const ContractCard = ({ contract, onDeleteRequest }) => {
        const { propertyAddress, contractType, partyInfo, startDate, endDate, rentAmount, salePrice, status } = contract;
        const otherParty = partyInfo.find(p => p.userId !== userId);

        const statusStyles = {
            active: { text: 'فعال', bg: 'bg-green-100', text_color: 'text-green-800' },
            expired: { text: 'منقضی', bg: 'bg-red-100', text_color: 'text-red-800' },
        };
        
        return (
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-indigo-500">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 flex items-center"><Building className="w-5 h-5 ml-2 text-gray-500"/>{propertyAddress}</h3>
                        <p className="text-sm text-gray-500 mt-1">قرارداد {contractType === 'rent' ? 'اجاره' : 'فروش'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusStyles[status]?.bg} ${statusStyles[status]?.text_color}`}>
                            {statusStyles[status]?.text || status}
                        </span>
                        <button onClick={() => onDeleteRequest(contract.id)} className="text-gray-400 hover:text-red-600 p-1 rounded-full"><Trash2 size={18}/></button>
                    </div>
                </div>
                <div className="border-t my-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                        <p className="flex items-center"><UserCheck className="w-4 h-4 ml-2 text-gray-500"/><strong>طرف دوم:</strong> {otherParty?.email || 'نامشخص'}</p>
                        <p className="flex items-center"><Calendar className="w-4 h-4 ml-2 text-gray-500"/><strong>تاریخ شروع:</strong> {new Date(startDate).toLocaleDateString('fa-IR')}</p>
                    </div>
                    <div className="space-y-2">
                        {contractType === 'rent' ? (
                            <>
                                <p className="flex items-center"><DollarSign className="w-4 h-4 ml-2 text-gray-500"/><strong>اجاره بها:</strong> {rentAmount?.toLocaleString()} تومان</p>
                                {endDate && <p className="flex items-center"><Calendar className="w-4 h-4 ml-2 text-gray-500"/><strong>تاریخ پایان:</strong> {new Date(endDate).toLocaleDateString('fa-IR')}</p>}
                            </>
                        ) : (
                            <p className="flex items-center"><DollarSign className="w-4 h-4 ml-2 text-gray-500"/><strong>مبلغ فروش:</strong> {salePrice?.toLocaleString()} تومان</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <AddContractModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                db={db} 
                userId={userId}
                userEmail={user.email}
                userRole={userRole}
                properties={properties}
            />
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="حذف قرارداد"
                message="آیا از حذف این قرارداد اطمینان دارید؟ این عمل غیرقابل بازگشت است."
            />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                    <FileSignature className="mr-3 w-7 h-7 text-green-600"/>
                    مدیریت قراردادها
                </h1>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-green-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-green-700 transition text-sm font-semibold">
                    <PlusCircle className="w-5 h-5 ml-2"/> ایجاد قرارداد جدید
                </button>
            </div>

            {properties.length === 0 && !isLoading && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
                    <div className="flex">
                        <div className="py-1"><AlertTriangle className="h-6 w-6 text-yellow-500 mr-4"/></div>
                        <div>
                            <p className="font-bold">راهنمایی</p>
                            <p className="text-sm">برای ایجاد قرارداد، ابتدا باید حداقل یک ملک در بخش "کارتابل من" ثبت کنید.</p>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="space-y-6">
                {contracts.length > 0 ? (
                    contracts.map(contract => (
                        <ContractCard key={contract.id} contract={contract} userId={userId} onDeleteRequest={handleDeleteRequest} />
                    ))
                ) : (
                    <div className="text-center py-16 bg-white rounded-xl shadow-md">
                        <FileText size={48} className="mx-auto text-gray-300"/>
                        <h3 className="mt-4 text-lg font-semibold text-gray-700">هنوز قراردادی ثبت نشده است</h3>
                        <p className="mt-1 text-sm text-gray-500">با کلیک بر روی "ایجاد قرارداد جدید" اولین قرارداد خود را اضافه کنید.</p>
                    </div>
                )}
            </div>
        </>
    );
}

// --- ساختار و چیدمان اصلی ---
function Sidebar({ onNavigate, onLogout, user, activeView, isDemo, isOpen, setIsOpen }) {
    const { userRole } = useAuth();
    const navItems = [
        { name: 'داشبورد', icon: LayoutDashboard, view: 'dashboard' },
        { name: 'کارتابل من', icon: User, view: 'profile' },
        { name: 'قراردادها', icon: FileSignature, view: 'contracts' },
        { name: 'درخواست ها', icon: ClipboardList, view: 'requests' },
        { name: 'تنظیمات', icon: Settings, view: 'settings' },
    ];
    if (userRole === 'admin' || isDemo) {
        if(!navItems.find(item => item.view === 'admin')){
             navItems.splice(2, 0, { name: 'پنل مدیریت', icon: Shield, view: 'admin' });
        }
    }

    const handleNav = (view) => {
        onNavigate(view);
        setIsOpen(false);
    }

    return (
        <div className={`fixed inset-y-0 right-0 z-30 w-64 bg-white border-l shadow-lg flex-col h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'} md:flex`}>
            <div className="p-4 border-b flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-indigo-600">پلتفرم املاک</h2>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="md:hidden p-1 text-gray-600 hover:text-gray-900">
                    <XIcon size={24} />
                </button>
            </div>
            <nav className="flex-grow p-4">
                <ul>
                    {navItems.map(item => (
                        <li key={item.name}>
                            <button onClick={() => handleNav(item.view)} disabled={isDemo && item.view !== 'dashboard'} className={`w-full flex items-center p-3 my-1 rounded-lg transition-colors ${activeView === item.view ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-indigo-50'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                <item.icon className="w-5 h-5 ml-3"/>
                                <span>{item.name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="p-4 border-t">
                <button onClick={onLogout} className="w-full flex items-center p-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut className="w-5 h-5 ml-3"/>
                    <span>{isDemo ? 'خروج از حالت نمایش' : 'خروج از حساب'}</span>
                </button>
            </div>
        </div>
    );
}

function AppLayout({ children, onNavigate, onLogout, user, activeView, isDemo = false }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <Sidebar onNavigate={onNavigate} onLogout={onLogout} user={user} activeView={activeView} isDemo={isDemo} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}/>
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-20 md:hidden"></div>}
            <div className="flex-1 flex flex-col">
                <header className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-gray-800">پلتفرم املاک</h2>
                     <button onClick={() => setIsSidebarOpen(true)}>
                        <Menu size={24} />
                    </button>
                </header>
                <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

// --- کامپوننت اصلی مدیریت نمایش صفحات ---
function MainAppContent() {
  const { user, loading, logout, isDemo, endDemo, userId, db } = useAuth();
  const [view, setView] = useState('dashboard');
  const [managedUser, setManagedUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);

  useEffect(() => {
    if (!userId || !db) {
        setIsLoadingProperties(false);
        return;
    };

    setIsLoadingProperties(true);
    const q = query(collection(db, "properties"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const props = [];
        querySnapshot.forEach((doc) => {
            props.push({ id: doc.id, ...doc.data() });
        });
        setProperties(props);
        setIsLoadingProperties(false);
    });
    return () => unsubscribe();
  }, [userId, db]);

  const handleNavigation = (targetView, data = null) => {
      if (isDemo) return;
      if (targetView === 'manageUser') {
          setManagedUser(data);
          setView('profile');
      } else {
          setManagedUser(null);
          setView(targetView);
      }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen font-bold text-xl text-gray-500">در حال بارگذاری...</div>;
  }

  if (isDemo) {
    const demoUser = { email: 'demo@example.com' };
    const sampleProperties = [
        { id: 1, address: 'تهران، خیابان سعادت آباد، برج کاج', propertyType: 'apartment', area: 150 },
        { id: 2, address: 'اصفهان، خیابان چهارباغ، مجتمع پارسیان', propertyType: 'store', area: 50 },
        { id: 3, address: 'لواسان، شهرک باستی، ویلای شماره ۱۲', propertyType: 'villa', area: 800 },
    ];
    
    return (
        <AppLayout onNavigate={handleNavigation} onLogout={endDemo} user={demoUser} activeView="dashboard" isDemo={true}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg p-6 mb-6 text-center">
                <h2 className="text-2xl font-bold flex items-center justify-center"><Zap className="w-7 h-7 ml-2"/>تمام امکانات را آزاد کنید!</h2>
                <p className="mt-2">با ثبت‌نام کامل، می‌توانید املاک خود را ثبت و مدیریت کنید، قراردادهای رسمی ایجاد نمایید و به تمام ابزارهای پیشرفته دسترسی داشته باشید.</p>
                <button onClick={endDemo} className="mt-4 bg-white text-indigo-600 font-bold py-2 px-6 rounded-lg hover:bg-gray-200 transition-transform transform hover:scale-105">
                    ثبت‌نام و فعال‌سازی امکانات
                </button>
            </div>
            <PropertyAnalyticsDashboard properties={sampleProperties} onAddProperty={() => {}} isDemo={true} onRegisterClick={endDemo} />
        </AppLayout>
    );
  }

  if (user) {
    let content;
    switch (view) {
      case 'profile': 
        content = <ProfileAndPropertiesPage managedUser={managedUser} />;
        break;
      case 'admin': 
        content = <AdminDashboard onManageUser={(userToManage) => handleNavigation('manageUser', userToManage)} />;
        break;
      case 'contracts':
        content = <ContractsPage />;
        break;
      case 'dashboard':
      default:
        content = isLoadingProperties ? <p>در حال بارگذاری داشبورد...</p> : <PropertyAnalyticsDashboard properties={properties} onAddProperty={() => setIsAddPropertyModalOpen(true)} />;
    }
    
    return (
        <AppLayout onNavigate={handleNavigation} onLogout={logout} user={user} activeView={view}>
            <AddPropertyModal isOpen={isAddPropertyModalOpen} onClose={() => setIsAddPropertyModalOpen(false)} userId={userId} db={db} />
            {content}
        </AppLayout>
    );
  }

  return <AuthForm />;
}

// --- نقطه شروع اپلیکیشن ---
export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
