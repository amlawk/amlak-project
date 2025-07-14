import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, addDoc } from 'firebase/firestore';

// --- آیکون‌ها ---
import { Home, Users, Search, ClipboardList, Wallet, User, Mail, Lock, FileText, CreditCard, LogOut, CheckCircle, Store, ShoppingCart, Phone, Briefcase, MapPin, Shield, Edit, Save, XCircle, ArrowLeft, AlertTriangle, Sparkles, X } from 'lucide-react';

// --- ۱. Context برای مدیریت احراز هویت و حالت دمو ---
const AuthContext = createContext(null);

// Hook کمکی برای دسترسی آسان به Context
function useAuth() {
  return useContext(AuthContext);
}

// --- ۲. کامپوننت اصلی برای فراهم کردن اطلاعات کاربر ---
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);

  // State جدید برای مدیریت حالت دمو
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
          setUserRole(docSnap.exists() ? docSnap.data().role : null);
          setIsDemo(false); // خروج از حالت دمو در صورت ورود کاربر واقعی
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

  const login = async (email, password, selectedRole) => {
      setLoading(true);
      setError('');
      try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
              const storedRole = docSnap.data().role;
              if (storedRole !== 'admin' && storedRole !== selectedRole) {
                  await signOut(auth); 
                  setError('نقش انتخابی شما با نقش ثبت شده در سیستم مغایرت دارد.');
              }
          } else {
              await signOut(auth);
              setError('پروفایل کاربری یافت نشد.');
          }
      } catch(err) {
          setError('ایمیل یا رمز عبور اشتباه است.');
      } finally {
          setLoading(false);
      }
  };

  const logout = () => {
    if (auth) {
      signOut(auth);
    }
    setIsDemo(false); // خروج از حالت دمو هنگام خروج از حساب
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
        createdAt: new Date(),
        fullName: '',
        phoneNumber: '',
        job: '',
        location: ''
      });
      setUser(newUser);
      setUserId(newUser.uid);
      setUserRole(role);
    } catch (err) {
        setError('خطا در ثبت نام. ممکن است این ایمیل قبلا استفاده شده باشد.');
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
          return { success: false, error: 'خطا در ارسال ایمیل بازیابی. لطفا از صحیح بودن ایمیل خود اطمینان حاصل کنید.' };
      }
  };

  // --- FIX: Updated startDemo function ---
  const startDemo = async (phoneNumber, role) => {
    setLoading(true);
    setError('');
    try {
      // Attempt to save the lead to the database for marketing/tracking purposes.
      // This might fail if Firestore security rules don't allow unauthenticated writes.
      if (db) {
        await addDoc(collection(db, "demo_leads"), {
            phoneNumber,
            role,
            timestamp: new Date()
        });
      } else {
        console.error("Firebase DB not initialized. Cannot save demo lead.");
      }
    } catch (err) {
      // Don't block the user from entering the demo. Just log the error for the developer.
      console.error("Could not save demo lead. This is likely due to Firestore security rules.", err);
      // DEVELOPER NOTE: To fix this, go to your Firebase project -> Firestore Database -> Rules.
      // Add a rule to allow unauthenticated users to write to the 'demo_leads' collection.
      // It should look something like this:
      //
      // rules_version = '2';
      // service cloud.firestore {
      //   match /databases/{database}/documents {
      //     // ... your other rules
      //     match /demo_leads/{leadId} {
      //       allow create: if true;
      //     }
      //   }
      // }
    } finally {
      // IMPORTANT: Proceed to demo mode regardless of whether the lead was saved.
      // This ensures the user can always access the demo.
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

// --- ۳. کامپوننت‌های رابط کاربری (UI) ---

function RoleSelector({ selectedRole, setSelectedRole, disabled }) {
  const roles = [
    { value: 'landlord', label: 'موجر', icon: Home, color: 'indigo' },
    { value: 'tenant', label: 'مستأجر', icon: Users, color: 'green' },
    { value: 'seller', label: 'فروشنده', icon: Store, color: 'purple' },
    { value: 'buyer', label: 'خریدار', icon: ShoppingCart, color: 'yellow' },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {roles.map((role) => (
        <label key={role.value} className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all w-[calc(50%-0.375rem)] sm:w-[calc(25%-0.5625rem)] ${selectedRole === role.value ? `border-${role.color}-600 bg-${role.color}-50 shadow-md` : 'border-gray-300 hover:border-gray-400 bg-gray-50'} ${disabled ? 'opacity-60 ' : 'cursor-pointer'}`}>
          <input type="radio" className="hidden" name="role" value={role.value} checked={selectedRole === role.value} onChange={(e) => setSelectedRole(e.target.value)} disabled={disabled}/>
          {React.createElement(role.icon, { className: `w-6 h-6 text-${role.color}-600 mb-1` })}
          <span className="text-sm font-medium text-gray-800">{role.label}</span>
          {selectedRole === role.value && <CheckCircle className={`w-4 h-4 text-${role.color}-600 mt-1`} />}
        </label>
      ))}
    </div>
  );
}

function AuthForm() {
  const [authFlowState, setAuthFlowState] = useState('login'); // 'login', 'register', 'forgotPassword', 'demo'
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
    else if (authFlowState === 'demo') await startDemo(phoneNumber, selectedRole);
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const result = await resetPassword(email);
    setMessage(result.success ? 'ایمیل بازیابی رمز عبور با موفقیت ارسال شد.' : result.error);
  };
  
  const renderTabs = () => (
      <div className="flex border-b mb-6">
          <button onClick={() => setAuthFlowState('login')} className={`flex-1 py-2 font-semibold ${authFlowState === 'login' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>ورود</button>
          <button onClick={() => setAuthFlowState('register')} className={`flex-1 py-2 font-semibold ${authFlowState === 'register' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}>ثبت نام</button>
          <button onClick={() => setAuthFlowState('demo')} className={`flex-1 py-2 font-semibold ${authFlowState === 'demo' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}>ورود دمو</button>
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
    
    const isDemoFlow = authFlowState === 'demo';
    return (
      <>
        {renderTabs()}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
            {isDemoFlow ? 'ورود به نسخه نمایشی' : (authFlowState === 'register' ? 'ایجاد حساب کاربری' : 'ورود به حساب')}
        </h2>
        {authError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 text-sm" role="alert">{authError}</div>}
        <form onSubmit={handleMainSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">نقش خود را انتخاب کنید:</label>
            <RoleSelector selectedRole={selectedRole} setSelectedRole={setSelectedRole} disabled={loading}/>
          </div>
          {isDemoFlow ? (
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
          <button type="submit" className={`w-full text-white font-bold py-3 rounded-lg transition ${isDemoFlow ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`} disabled={loading}>
            {loading ? 'در حال پردازش...' : (isDemoFlow ? 'ورود به دمو' : (authFlowState === 'register' ? 'ثبت نام' : 'ورود'))}
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

function SampleContractModal({ isOpen, onClose }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><X size={24}/></button>
                <h2 className="text-xl font-bold mb-4">ایجاد قرارداد نمونه</h2>
                <p className="text-gray-600 mb-4">در نسخه کامل، شما می‌توانید قراردادهای رسمی با جزئیات کامل ایجاد، امضا و مدیریت کنید. این یک پیش‌نمایش ساده است.</p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">طرف اول (موجر/فروشنده)</label>
                        <input type="text" placeholder="نام کامل" className="mt-1 w-full p-2 border rounded-md bg-gray-100" disabled/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">طرف دوم (مستاجر/خریدار)</label>
                        <input type="text" placeholder="نام کامل" className="mt-1 w-full p-2 border rounded-md bg-gray-100" disabled/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">مبلغ قرارداد (تومان)</label>
                        <input type="text" placeholder="مثال: 50,000,000" className="mt-1 w-full p-2 border rounded-md bg-gray-100" disabled/>
                    </div>
                </div>
                <div className="mt-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md">
                    <p className="font-bold">قابلیت ویژه!</p>
                    <p>برای فعال‌سازی فرم کامل و ذخیره قرارداد، حساب کاربری خود را ایجاد کنید.</p>
                </div>
                <button onClick={onClose} className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">متوجه شدم</button>
            </div>
        </div>
    );
}

function DashboardLayout({ title, icon: TitleIcon, features, currentUser, logout, isDemo, onRegisterClick, onNavigateToProfile }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const handleFeatureClick = (action) => {
        if (action === 'sample_contract') {
            setIsModalOpen(true);
        } else if (isDemo) {
            // In demo mode, we can show a message for other buttons,
            // but for simplicity, we do nothing for now.
        }
    };
    
    return (
        <div className="bg-gray-50 min-h-screen">
            <SampleContractModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            {isDemo && (
                <div className="bg-green-600 text-white text-center p-3">
                    <Sparkles className="inline-block w-5 h-5 mr-2" />
                    شما در حالت دمو هستید. برای دسترسی به تمام امکانات، <button onClick={onRegisterClick} className="font-bold underline hover:text-green-200">ثبت‌نام کنید</button>!
                </div>
            )}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        {React.createElement(TitleIcon, { className: "w-6 h-6 mr-2" })}
                        {title}
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 hidden sm:block">
                            {isDemo ? `حساب دمو` : `خوش آمدید، ${currentUser?.email}`}
                        </span>
                        <button onClick={logout} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 transition"><LogOut className="w-5 h-5"/></button>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {!isDemo && (
                          <button onClick={onNavigateToProfile} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-4">
                              <User className="w-10 h-10 text-indigo-500"/>
                              <div>
                                  <h3 className="text-lg font-bold text-gray-800">پروفایل من</h3>
                                  <p className="text-sm text-gray-500">اطلاعات کاربری خود را ویرایش کنید</p>
                              </div>
                          </button>
                        )}
                        {features.map((feature, index) => (
                            <button key={index} onClick={() => handleFeatureClick(feature.action)} className={`bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-4 ${isDemo && !feature.action ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {React.createElement(feature.icon, { className: "w-10 h-10 text-green-500" })}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">{feature.title}</h3>
                                    <p className="text-sm text-gray-500">{feature.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

function LandlordDashboard(props) {
    const demoFeatures = [ { icon: FileText, title: 'ایجاد قرارداد نمونه', description: 'یک پیش‌نمایش از قرارداد اجاره بسازید', action: 'sample_contract' }, { icon: Wallet, title: 'پیگیری پرداخت‌ها', description: 'وضعیت پرداخت اجاره‌ها را ببینید' }, ];
    const realFeatures = [ { icon: ClipboardList, title: 'بررسی درخواست‌ها', description: 'درخواست‌های اجاره را ببینید' }, { icon: Wallet, title: 'پیگیری پرداخت‌ها', description: 'وضعیت پرداخت اجاره‌ها' }, ];
    return <DashboardLayout title="داشبورد موجر" icon={Home} features={props.isDemo ? demoFeatures : realFeatures} {...props} />;
}

function TenantDashboard(props) {
    const demoFeatures = [ { icon: Search, title: 'جستجوی ملک', description: 'ملک‌های جدید را پیدا کنید' }, { icon: FileText, title: 'مشاهده قرارداد نمونه', description: 'یک پیش‌نمایش از قرارداد اجاره ببینید', action: 'sample_contract' }, ];
    const realFeatures = [ { icon: Search, title: 'جستجوی ملک', description: 'ملک‌های جدید را پیدا کنید' }, { icon: CreditCard, title: 'پرداخت اجاره', description: 'اجاره ماهانه را پرداخت کنید' }, ];
    return <DashboardLayout title="داشبورد مستأجر" icon={Users} features={props.isDemo ? demoFeatures : realFeatures} {...props} />;
}

function MainAppContent() {
  const { user, loading, userRole, logout, isDemo, demoInfo, endDemo } = useAuth();
  const [view, setView] = useState('dashboard');

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen font-bold text-xl text-gray-500">در حال بارگذاری...</div>;
  }

  if (isDemo) {
      const demoProps = { 
          logout: endDemo, 
          isDemo: true, 
          onRegisterClick: endDemo 
      };
      switch (demoInfo.role) {
          case 'landlord': return <LandlordDashboard {...demoProps} />;
          case 'tenant': return <TenantDashboard {...demoProps} />;
          default: return <LandlordDashboard {...demoProps} />;
      }
  }

  if (user) {
    switch (view) {
      case 'profile': return <UserProfilePage onBack={() => setView('dashboard')} />;
      case 'admin': return <AdminDashboard onUserSelect={(uid) => console.log(`Admin managing user: ${uid}`)} onBackToUserDashboard={() => setView('dashboard')} />;
      case 'dashboard':
      default:
          const dashboardProps = { 
              currentUser: user, logout, onNavigateToProfile: () => setView('profile'),
              onNavigateToAdmin: userRole === 'admin' ? () => setView('admin') : null,
          };
          switch (userRole) {
              case 'landlord': return <LandlordDashboard {...dashboardProps} />;
              case 'tenant': return <TenantDashboard {...dashboardProps} />;
              case 'admin': return <LandlordDashboard {...dashboardProps} />;
              default:
                  return (
                      <div className="flex flex-col items-center justify-center min-h-screen">
                          <p className="text-red-500 mb-4">نقش شما در سیستم تعریف نشده است.</p>
                          <button onClick={logout} className="bg-indigo-600 text-white py-2 px-4 rounded-lg">خروج</button>
                      </div>
                  );
          }
    }
  }

  return <AuthForm />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

function UserProfilePage({ onBack }) {
    const { db, userId } = useAuth();
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId || !db) return;
            setIsLoading(true);
            try {
                const docRef = doc(db, 'users', userId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProfile({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setError('پروفایل یافت نشد.');
                }
            } catch (err) {
                setError('خطا در دریافت اطلاعات پروفایل.');
            }
            setIsLoading(false);
        };
        fetchProfile();
    }, [userId, db]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');
        try {
            const userRef = doc(db, 'users', userId);
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

    if (isLoading) return <div className="p-8 text-center text-gray-600">در حال بارگذاری پروفایل...</div>;

    return (
        <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6 sm:p-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><User className="mr-3 w-7 h-7 text-indigo-600"/>پروفایل کاربری</h1>
                {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
                {success && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm">{success}</div>}
                {profile && (
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
                )}
                <div className="mt-8 flex flex-wrap gap-4">
                    {isEditing ? (
                        <>
                            <button onClick={handleSave} className="bg-green-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-green-700 transition"><Save className="w-5 h-5 mr-2"/>ذخیره</button>
                            <button onClick={() => setIsEditing(false)} className="bg-gray-500 text-white py-2 px-4 rounded-lg flex items-center hover:bg-gray-600 transition"><XCircle className="w-5 h-5 mr-2"/>انصراف</button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="bg-indigo-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-indigo-700 transition"><Edit className="w-5 h-5 mr-2"/>ویرایش پروفایل</button>
                    )}
                    <button onClick={onBack} className="bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center hover:bg-gray-800 transition"><ArrowLeft className="w-5 h-5 mr-2"/>بازگشت به داشبورد</button>
                </div>
            </div>
        </div>
    );
}

function AdminDashboard({ onUserSelect, onBackToUserDashboard }) {
  const { db } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
        if (!db) return;
        setIsLoading(true);
        const usersSnapshot = await getDocs(collection(db, "users"));
        setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setIsLoading(false);
    };
    fetchUsers();
  }, [db]);

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Shield className="mr-3 w-7 h-7 text-red-600"/>پنل مدیریت</h1>
        {isLoading ? <p>در حال بارگذاری لیست کاربران...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ایمیل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نقش</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{u.role}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => onUserSelect(u.id)} className="text-indigo-600 hover:text-indigo-900">مدیریت کاربر</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button onClick={onBackToUserDashboard} className="mt-8 px-5 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition">بازگشت به داشبورد</button>
      </div>
    </div>
  );
}
