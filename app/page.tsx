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


export default function Home() {
  const params = useSearchParams();
  const router = useRouter()

  const [userData, setUserData] = useState<UserData | null>(null)
  const [score, setScore] = useState(0)
  const [incr, setIncr] = useState(0)
  const [energy, setEnergy] = useState(0)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [tapTimeout, setTapTimeout] = useState<NodeJS.Timeout | null>(null)


  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy(prev => prev + 1);
    }, 5000); // mỗi 5s thì +1 energy

    return () => clearInterval(interval);
  }, []);

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
    console.log("___userData", userData);

    if (userData) {
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
        console.log('ON event score: ', res);

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
        handleIfStopTap();
      }, 1000);
      setTapTimeout(timeout);
    } catch (error) {
      console.error('Error making API call:', error);
    }
  };

  const handleIfStopTap = async () => {
    console.log("____handleIfStopTap");

    if (socket) {
      socket.emit('update_score', { userId: userData?.id, incr, energy });
      setScore(prev => {
        const newScore = prev + incr;
        setIncr(0)
        return newScore
      })
    }
  }

  return (
    <main className="p-4">
      {userData ? (
        <>
          <div className='flex justify-between items-center'>
            <div className='mb-4'>
              Score: {score + incr}
            </div>

            <div className='mb-4'>
              Energy: {energy}
            </div>
          </div>
          <div className='h-full flex justify-center items-center'>
            <button
              disabled={energy <= 0}
              onClick={handleButtonTap}
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
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