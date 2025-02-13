
import notifee, {EventType} from '@notifee/react-native';


notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('Notifee background event:', type, detail);
  if (type === EventType.PRESS) {

    // Con pressAction: { id: 'default' }, la app se abrirá automáticamente.
  }
});
