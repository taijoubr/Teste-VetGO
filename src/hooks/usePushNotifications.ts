import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verifica suporte e estado atual
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      // Registra o Service Worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          setIsSubscribed(!!sub);
        })
        .catch((err) => {
          console.warn('Service worker registration error:', err);
        });
    }
  }, []);

  // Ativar notificações
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Notificações push não são suportadas neste navegador ou dispositivo.');
    }

    setLoading(true);
    setError(null);

    try {
      // Solicita permissão nativa
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        throw new Error('Permissão para notificações não foi autorizada no navegador.');
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidPublicKey = await api.getVapidPublicKey();
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      await api.subscribePush(subscription.toJSON());
      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      const msg = err.message || 'Erro ao ativar notificações push.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  // Desativar notificações
  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await api.unsubscribePush(sub.endpoint);
      }
      setIsSubscribed(false);
      return true;
    } catch (err: any) {
      const msg = err.message || 'Erro ao desativar notificações.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Enviar teste de notificação
  const sendTestNotification = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sendTestPushNotification();
      return res;
    } catch (err: any) {
      const msg = err.message || 'Erro ao disparar notificação de teste.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
