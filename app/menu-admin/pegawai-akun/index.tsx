import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function PegawaiAkunIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/menu-admin/pegawai-akun/data-pegawai-admin');
  }, []);

  return null;
}
