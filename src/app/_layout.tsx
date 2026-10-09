import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { socketManager } from '../utils/socket';

export default function RootLayout() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // On app start, check if there's a saved session to rejoin
  useEffect(() => {
    const checkRejoin = async () => {
      try {
        const result = await socketManager.rejoinGame();
        if (result.success && result.started) {
          // Game was in progress — jump straight back in
          router.replace(`/game/${socketManager.gameId || 'online'}` as never);
        } else if (result.success && !result.started) {
          // Was in a lobby — go back to create screen (host) or show waiting
          if (result.isHost) {
            router.replace('/lobby/create' as never);
          }
        }
      } catch (err) {
        console.log('[Rejoin] No saved session or failed:', err);
      }
      setChecked(true);
    };

    checkRejoin();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A1628' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="lobby/create" />
        <Stack.Screen name="lobby/join" />
        <Stack.Screen
          name="game/[gameId]"
          options={{ animation: 'fade', gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}
