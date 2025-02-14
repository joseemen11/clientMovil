import {GoogleSignin} from '@react-native-google-signin/google-signin';
import React, {useEffect, useRef, useState} from 'react';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  BackHandler,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import {WebView} from 'react-native-webview';
import notifee, {AndroidImportance} from '@notifee/react-native';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';

const App = () => {
  const webviewRef = useRef<WebView>(null);
  const [showGoogleButton, setShowGoogleButton] = useState<boolean>(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [fcmToken, setFcmToken] = useState<string>('');
  const [pendingRedirectLink, setPendingRedirectLink] = useState<any>(null);

  useEffect(() => {
    createDefaultChannel();
    requestAndroidNotificationPermission();
    GoogleSignin.configure({
      webClientId:
        '478293875794-c3g29qmu7demtoriko6qjltavqskhhjs.apps.googleusercontent.com',
    });
  }, []);

  async function createDefaultChannel() {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });
  }

  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [canGoBack]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      await requestNotificationPermission();
      const token = await messaging().getToken();
      setFcmToken(token);      
      const unsubscribe = messaging().onMessage(async remoteMessage => {
        Alert.alert(
          typeof remoteMessage.data?.title === 'string' ? remoteMessage.data.title : '',
          typeof remoteMessage.data?.body === 'string'
            ? remoteMessage.data.body
            : JSON.stringify(remoteMessage.data?.body || {}),
        );
      });
      return unsubscribe;
    };
    setupNotifications().then(unsub => {
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        if (nextState === 'active') {

          const pendingLink = await AsyncStorage.getItem('pendingLink');
          if (pendingLink) {
            redirectToLink(pendingLink);
            await AsyncStorage.removeItem('pendingLink'); 
          }
        }
      },
    );
    return () => subscription.remove();
  }, []);

  const injectFcmToken = () => {
    if (!webviewRef.current || !fcmToken) {
      console.log('No se puede inyectar: WebView o FCM Token no disponible');
      return;
    }

    const dataToInject = {fcmToken};
    
    const dataString = JSON.stringify(dataToInject)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");

    const script = `
      (function() {
        var data = '${dataString}';

        window.localStorage.setItem('fcmTokenNative', data);

      })();
    `;

    webviewRef.current.injectJavaScript(script);
  };

  const onGoogleButtonPress = async () => {
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      const result = await GoogleSignin.signIn();
      if (!result?.data?.idToken) {
        throw new Error('No se pudo obtener el idToken');
      }
      const firebaseIdToken = await auth()?.currentUser?.getIdToken();
      const uid = await auth()?.currentUser?.uid;
      const extractedData = {
        email: result.data.user.email,
        accessToken: firebaseIdToken,
        displayName: result.data.user.name,
        phoneNumber: '',
        uid: uid,
        admin: true,
      };
      const googleCredential = auth.GoogleAuthProvider.credential(
        result?.data?.idToken,
      );
      await auth().signInWithCredential(googleCredential);
      if (webviewRef.current) {
        const injectedData = JSON.stringify(extractedData)
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'");
        const script = `
          (function() {
            var data = '${injectedData}';
            window.localStorage.setItem('googleUserData', data);
          })();
        `;
        webviewRef.current.injectJavaScript(script);
      }
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
    }
  };
  const handleNavigationStateChange = (navState: any) => {
    const {url, canGoBack} = navState;
    setCanGoBack(canGoBack);
    try {
      if (url.match(/\/(login)(\?|$)/)) {
        setShowGoogleButton(true);
        injectFcmToken();
      } else {
        setShowGoogleButton(false);
      }
    } catch (error) {
      console.error('Error al analizar la URL:', error);
      setShowGoogleButton(false);
    }
  };

  useEffect(() => {
    async function checkInitialNotification() {
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification?.notification?.data?.link) {
        setPendingRedirectLink(initialNotification.notification.data.link);
      }
    }

    checkInitialNotification();
  }, []);

  const handleWebViewLoadEnd = () => {
    if (pendingRedirectLink) {
      const baseUrl = 'https://ticona.store';
      const fullUrl = baseUrl + pendingRedirectLink;
      const script = `
        (function() {
          window.location.href = '${fullUrl}';
        })();
      `;
      webviewRef.current?.injectJavaScript(script);

      setPendingRedirectLink(null);
    }
  };

  const redirectToLink = (link: string) => {
    if (webviewRef.current) {
      const baseUrl = 'https://ticona.store';
      const fullUrl = baseUrl + link;

      const script = `
        (function() {
          window.location.href = '${fullUrl}';
        })();
      `;
      webviewRef.current.injectJavaScript(script);
    }
  };

  useEffect(() => {
    if (fcmToken) {
      injectFcmToken();
    }
  }, [fcmToken]);
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          {/* WebView se coloca en un ScrollView */}
          <ScrollView contentContainerStyle={{flexGrow: 1}}>
            <WebView
              ref={webviewRef}
              //source={{uri: 'https://dev.ticonaa.com'}}
              // source={{uri: 'https://admindev.ticona.store'}}
              // source={{uri: 'http://192.168.0.15:3003'}}
              source={{uri: 'https://ticona.store'}}
              // source={{uri: 'https://admin.ticona.store'}}
              style={styles.webview}
              onMessage={event => {}}
              onLoadEnd={handleWebViewLoadEnd}
              onNavigationStateChange={handleNavigationStateChange}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              domStorageEnabled={true}
              javaScriptEnabled={true}
            />
          </ScrollView>
          {showGoogleButton && (
            <View style={styles.googleButtonContainer}>
              <TouchableOpacity
                onPress={onGoogleButtonPress}
                style={styles.googleButton}>
                <Text style={styles.buttonText}>Ingresar con Google</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  webview: {
    flex: 1,
  },
  googleButtonContainer: {
    marginVertical: 10,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
  },
});
const requestLocationPermission = async () => {
  try {
    const granted = await request(
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    );
    if (granted === 'granted') {
      Geolocation.getCurrentPosition(
        position => {},
        error => {
          console.log(error.code, error.message);
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    }
  } catch (err) {
    console.warn(err);
  }
};
const requestNotificationPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

};

const requestAndroidNotificationPermission = async () => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const notifResult = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);

      if (notifResult !== RESULTS.GRANTED) {
        Alert.alert(
          'Permiso de notificaciones denegado',
          'No podremos mostrarte notificaciones de nuevos pedidos.',
        );
      }
    }
  }
};

export default App;
