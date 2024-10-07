import {GoogleSignin} from '@react-native-google-signin/google-signin';
import React, {useEffect, useRef, useState} from 'react';
import { request, PERMISSIONS } from 'react-native-permissions';
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
} from 'react-native';
import {WebView} from 'react-native-webview';
import auth from '@react-native-firebase/auth';
const App = () => {
  const webviewRef = useRef<WebView>(null);
  const [showGoogleButton, setShowGoogleButton] = useState<boolean>(false);
  const [canGoBack, setCanGoBack] = useState(false);
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '478293875794-c3g29qmu7demtoriko6qjltavqskhhjs.apps.googleusercontent.com',
    });
  }, []);
  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true; // Prevenir el comportamiento predeterminado
      }
      return false; // Permitir el comportamiento predeterminado (cerrar la app)
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, [canGoBack]);
  useEffect(() => {
    requestLocationPermission();
  }, []);
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
      } else {
        setShowGoogleButton(false);
      }
    } catch (error) {
      console.error('Error al analizar la URL:', error);
      setShowGoogleButton(false);
    }
  };
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
              //source={{uri: 'https://admindev.ticonaa.com'}}
             source={{uri: 'https://ticona.store'}}
              //source={{uri: 'https://admin.ticona.store'}}
              style={styles.webview}
              onMessage={event => {
                console.log(
                  'Mensaje recibido desde la web:',
                  event.nativeEvent.data,
                );
              }}
              onNavigationStateChange={handleNavigationStateChange}
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
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
    );
    if (granted === 'granted') {
      console.log('Permiso de ubicación concedido');
      // Obtener ubicación
      Geolocation.getCurrentPosition(
        position => {
          console.log(position);
        },
        error => {
          console.log(error.code, error.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      console.log('Permiso de ubicación denegado');
    }
  } catch (err) {
    console.warn(err);
  }
};
export default App;