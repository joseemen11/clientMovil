/**
 * @format
 */
import messaging from '@react-native-firebase/messaging';
import notifee, {AndroidImportance} from '@notifee/react-native';
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
    
    const {link, ...restData} = remoteMessage.data || {};
    const titleFromBody = remoteMessage.data?.title ?? '';
    const bodyFromTitle = remoteMessage.data?.body ?? '';

    await notifee.displayNotification({
      title: titleFromBody,
      body: bodyFromTitle,
      data: remoteMessage.data,
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
