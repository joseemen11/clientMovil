import {GoogleSignin} from '@react-native-google-signin/google-signin';
import React, {useEffect, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import {WebView} from 'react-native-webview';
import auth from '@react-native-firebase/auth';

const App = () => {
  const webviewRef = useRef<WebView>(null);
  const [showGoogleButton, setShowGoogleButton] = useState<boolean>(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '478293875794-c3g29qmu7demtoriko6qjltavqskhhjs.apps.googleusercontent.com',
    });
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
    const {url} = navState;
    try {
      if (url.match(/\/(login|signup)(\?|$)/)) {
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
              source={{uri: 'http://192.168.1.104:3003'}}
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
                <Text style={styles.buttonText}>Iniciar sesión con Google</Text>
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

export default App;
