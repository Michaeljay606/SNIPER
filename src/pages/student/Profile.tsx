import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import ProfileTab from '../../components/tabs/ProfileTab';
import { supabase } from '../../lib/supabase';
import { useUserRole } from '../../hooks/useUserRole';

export default function ProfilePage() {
  const { tenantConfig, tenant_id } = useOutletContext<any>();
  const { isAdmin, canEditProfile, currentUser } = useUserRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <ProfileTab 
      tenant_id={tenant_id}
      tenantProfile={tenantConfig} 
      config={tenantConfig} 
      isAdminUser={canEditProfile}
      currentUser={currentUser}
      onLogout={handleLogout}
    />
  );
}
