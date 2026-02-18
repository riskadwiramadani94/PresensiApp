import { Stack } from 'expo-router';

export default function ProfilePegawaiLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom'
      }}
    >
      <Stack.Screen name="edit-profil" />
    </Stack>
  );
}
