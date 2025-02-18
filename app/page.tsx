'use client'

import WebApp from '@twa-dev/sdk'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import io, { Socket } from 'socket.io-client'

// Define the interface for user data
interface UserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
}


const mockUser: UserData = {
  id: 6694660655,
  first_name: "Lam",
  language_code: "en"
}

// const WEB_SOCKET_URL = 'ws://localhost:5397'
const WEB_SOCKET_URL = 'https://nekobot-api.namifutures.com'

const MAX_ENERGY = 1000;

export default function Home() {
  const params = useSearchParams();
  const router = useRouter()

  const [userData, setUserData] = useState<UserData | null>(mockUser)
  // const [userData, setUserData] = useState<UserData | null>(null)
  const [score, setScore] = useState(0)
  const [incr, setIncr] = useState(0)
  const [energy, setEnergy] = useState(0)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [tapTimeout, setTapTimeout] = useState<NodeJS.Timeout | null>(null)


  useEffect(() => {
    const interval = setInterval(() => {
      if (energy >= MAX_ENERGY) return;
      setEnergy(prev => prev + 1);
    }, 5000); // mỗi 5s thì +1 energy

    return () => clearInterval(interval);
  }, [energy]);

  useEffect(() => {
    if (WebApp.initDataUnsafe.user) {
      setUserData(WebApp.initDataUnsafe.user as UserData)
    }

    return () => {
      handleIfStopTap()
    }
  }, [])

  useEffect(() => {
    if (!socket) return;

    const refId = params.get('startapp');

    if (!refId) return;

    socket.emit('ref', { userId: userData?.id, refId });
  }, [params, router])

  useEffect(() => {
    if (userData) {
      console.log("___userData", userData);

      const newSocket = io(WEB_SOCKET_URL, {
        path: "/ws",
        query: { userId: userData.id.toString() }
      });

      // Listen for score updates
      newSocket.on('update_score', (res) => {
        console.log('Score updated event received:', res);
        const resScore = res?.data?.score;
        if (resScore !== null && resScore !== undefined) setScore(resScore)
      });

      newSocket.on('score', (res) => {
        console.log('ON event score: ', res?.data?.score);

        const value = res?.data?.score;
        if (value !== null && value !== undefined) setScore(value)
      });

      newSocket.on('energy', (res) => {
        console.log('ON event energy: ', res);

        const value = res?.data?.energy;
        if (value !== null && value !== undefined) setEnergy(value)
      });


      setSocket(newSocket)

      // Clean up the connection when the component is unmounted
      return () => {
        newSocket.close()
      }
    }
  }, [userData])


  const handleButtonTap = () => {
    try {
      setIncr(prev => prev + 1)
      setEnergy(prev => { const newEnergy = prev - 1; return newEnergy < 0 ? 0 : newEnergy; })

      if (tapTimeout) clearTimeout(tapTimeout);
      const timeout = setTimeout(() => {
        handleIfStopTap(incr + 1); // vì trong timeout nên sẽ miss 1 lần, phải +incr lên
      }, 1000);
      setTapTimeout(timeout);
    } catch (error) {
      console.error('Error making API call:', error);
    }
  };

  const handleIfStopTap = (_incr?: number) => {
    if (!_incr) _incr = incr
    if (socket) {
      socket.emit('update_score', { userId: userData?.id, incr: _incr, energy });
      setScore(prev => {
        setIncr(0);
        return prev + _incr
      })
    }
  }

  const handleCopyRefLink = () => {
    if (userData) {
      const refLink = `https://t.me/nekoton_nami_test_bot/nekoton_nami_test_web_app_name?startapp=${userData.id}`;
      navigator.clipboard.writeText(refLink).then(() => {
        alert('Referral link copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy the referral link: ', err);
      });
    }
  };

  return (
    <main className="p-4">
      {userData ? (
        <>
          <div className='flex justify-between items-center'>
            <div className='mb-4'>
              Score: {score + incr}
            </div>

            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:bg-slate-500"
              onClick={handleCopyRefLink}>Get Ref link</button>

            <div className='mb-4'>
              Energy: {energy}
            </div>
          </div>
          <div className='h-full flex justify-center items-center'>
            <button
              disabled={energy <= 0}
              onClick={handleButtonTap}
              className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:bg-slate-500"
            >
              Tap Me
            </button>
          </div>
        </>
      ) : (
        <div>Loading...</div>
      )}
    </main>
  )
}