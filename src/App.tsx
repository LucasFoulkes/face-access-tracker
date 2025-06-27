import { useRef, useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router';
import { userStorage } from './services/userStorage';
import { detectFace, findFaceMatch, loadFaceModels } from './services/faceRecognition';
import { AppSidebar } from './components/app-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './components/ui/sidebar';
import Tables from './pages/admin/tables';
import Actions from './pages/admin/actions';
import Reports from './pages/admin/reports';

function FaceDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string>('');
  const [showOptions, setShowOptions] = useState(false);
  const [currentFace, setCurrentFace] = useState<any>(null);
  const [newUser, setNewUser] = useState<{ name: string, pin: string, id: string } | null>(null);

  const isDetecting = modelsLoaded && !welcomeName && !showOptions && !newUser;

  // Load models
  useEffect(() => {
    loadFaceModels().then(() => setModelsLoaded(true));
  }, []);

  // Camera stream
  useEffect(() => {
    if (!isDetecting) return;

    let stream: MediaStream;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(mediaStream => {
        stream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => console.error('Video play failed:', err));
        }
      })
      .catch(err => alert(`Camera error: ${err.message}`));

    return () => stream?.getTracks().forEach(track => track.stop());
  }, [isDetecting]);

  // Face detection
  useEffect(() => {
    if (!isDetecting) return;

    const detect = async () => {
      const video = videoRef.current;
      if (!video?.videoWidth) return requestAnimationFrame(detect);

      try {
        const face = await detectFace(video);
        if (face) {
          const knownName = await findFaceMatch(face.descriptor);
          if (knownName) {
            const user = await userStorage.findByName(knownName);
            if (user) {
              await userStorage.logEntry(user.id, 'face');
              setWelcomeName(knownName);
            }
          } else {
            setCurrentFace(face);
            setShowOptions(true);
          }
        } else {
          requestAnimationFrame(detect);
        }
      } catch {
        requestAnimationFrame(detect);
      }
    };

    detect();
  }, [isDetecting]);

  const resetToDetection = () => {
    setWelcomeName('');
    setShowOptions(false);
    setCurrentFace(null);
    setNewUser(null);
  };

  const handlePinLogin = async () => {
    const pin = prompt('Enter your 4-digit PIN:');
    if (pin?.length === 4) {
      const user = await userStorage.findByPin(pin);
      if (user) {
        await userStorage.logEntry(user.id, 'pin');
        setWelcomeName(user.name);
      } else {
        alert('Invalid PIN');
      }
    }
    setShowOptions(false);
  };

  const handleCedulaLogin = async () => {
    const cedula = prompt('Enter your 10-digit cedula:');
    if (cedula?.length === 10) {
      const user = await userStorage.findByCedula(cedula);
      if (user) {
        await userStorage.logEntry(user.id, 'cedula');
        setWelcomeName(user.name);
      } else {
        alert('Invalid cedula');
      }
    }
    setShowOptions(false);
  };

  const handleRegister = async () => {
    const name = prompt('Enter your name:');
    if (!name) return setShowOptions(false);

    const cedula = prompt('Enter your 10-digit cedula:');
    if (!cedula || cedula.length !== 10) {
      alert('Cedula must be 10 digits');
      return setShowOptions(false);
    }

    const existingUser = await userStorage.findByCedula(cedula);
    if (existingUser) {
      // Check if user wants to add another face descriptor
      const addMore = confirm(`Cedula belongs to ${existingUser.name}. Add another face for better recognition?`);

      if (addMore) {
        await userStorage.add(existingUser.name, cedula, existingUser.pin, currentFace.descriptor);
        await userStorage.logEntry(existingUser.id, 'face');
        setWelcomeName(existingUser.name);
        setShowOptions(false);
        return;
      } else {
        setShowOptions(false);
        return;
      }
    }

    const pin = await userStorage.generateUniquePin();
    const id = await userStorage.add(name, cedula, pin, currentFace.descriptor);
    await userStorage.logEntry(id, 'register');

    setNewUser({ name, pin, id });
    setShowOptions(false);
  };

  if (!modelsLoaded) {
    return <div className="flex h-screen items-center justify-center bg-black text-white text-3xl">Loading...</div>;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-black relative">
      <video ref={videoRef} autoPlay playsInline muted className="max-w-full max-h-full object-cover" />

      {welcomeName && (
        <div className="absolute inset-0 bg-blue-500/90 flex flex-col items-center justify-center text-white cursor-pointer"
          onClick={resetToDetection}>
          <h2 className="text-4xl font-bold">Welcome {welcomeName}!</h2>
          <p className="mt-4">Tap to detect again</p>
        </div>
      )}

      {newUser && (
        <div className="absolute inset-0 bg-green-500/90 flex flex-col items-center justify-center text-white cursor-pointer"
          onClick={resetToDetection}>
          <h2 className="text-4xl font-bold">Welcome {newUser.name}!</h2>
          <p className="text-xl mt-4">User ID: {newUser.id}</p>
          <p className="text-2xl mt-2">Your PIN: {newUser.pin}</p>
          <p className="mt-2">Save this PIN for future access</p>
          <p className="mt-6">Tap to continue</p>
        </div>
      )}

      {showOptions && (
        <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center text-white">
          <h2 className="text-3xl font-bold mb-8">Face not recognized</h2>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setShowOptions(false)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold">Try Again</button>
            <button onClick={handlePinLogin} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-lg font-semibold">PIN</button>
            <button onClick={handleCedulaLogin} className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-lg font-semibold">Cedula</button>
            <button onClick={handleRegister} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg font-semibold">Register</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Admin Layout Component
function AdminLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <div className="h-px bg-border flex-1" />
          </div>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FaceDetection />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/tables" replace />} />
        <Route path="tables" element={<Tables />} />
        <Route path="actions" element={<Actions />} />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}