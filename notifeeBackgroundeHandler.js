import notifee, {EventType} from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });


  await notifee.displayNotification({
    title: remoteMessage.notification?.title ?? 'Título',
    body: remoteMessage.notification?.body ?? 'Mensaje',
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
});

notifee.onBackgroundEvent(async event => {
  const {type, detail} = event;
  if (type === EventType.PRESS) {    
    const link = detail.notification?.data?.link;
    if (link) {
    
      await AsyncStorage.setItem('pendingLink', link);
    }
  }
});
