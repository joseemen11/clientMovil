/**
 * @format
 */
import messaging from '@react-native-firebase/messaging';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import './notifeeBackgroundeHandler';
messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });

    const titleFromBody = remoteMessage.notification?.body ?? 'Notificación';
    const bodyFromTitle = remoteMessage.notification?.title ?? 'Nuevo pedido';

    await notifee.displayNotification({
      title: titleFromBody,
      body: bodyFromTitle,
      android: {
        channelId,

        smallIcon: 'ic_launcher',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        pressAction: {
          id: 'default',
        },
      },
    });
  } catch (error) {
    console.error('Error mostrando la notificación en segundo plano:', error);
  }
});

AppRegistry.registerComponent(appName, () => App);
