import { supabase } from './supabase';
import { TENANT_ID } from '../config';
// import { storage } from './firebase';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const compressImageClientSide = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimension 1200px
        const max_dim = 1200;
        if (width > height && width > max_dim) {
          height *= max_dim / width;
          width = max_dim;
        } else if (height > max_dim) {
          width *= max_dim / height;
          height = max_dim;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/webp', 0.8);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

export const compressAndUpload = async (
  file: File, 
  path: string, 
  onProgress?: (msg: string) => void
): Promise<string> => {
  try {
    if (onProgress) onProgress('Compression de l\'image...');
    
    // Compression drastique coté client
    const compressedFile = await compressImageClientSide(file);

    if (onProgress) onProgress('Envoi de l\'image...');

    // Nettoyage sécurisé du nom de fichier
    const safeName = compressedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}_${safeName}`;
    const bucketName = path === 'profile' ? 'profile' : 'results';

    // Utilisation de la méthode officielle Supabase JS avec un timer de timeout
    const uploadPromise = supabase.storage.from(bucketName).upload(`${TENANT_ID}/${fileName}`, compressedFile, {
      cacheControl: '3600',
      upsert: true
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TimeoutError')), 120000)
    );

    let supabaseData, supabaseError;
    try {
      const response = await Promise.race([uploadPromise, timeoutPromise]) as any;
      supabaseData = response.data;
      supabaseError = response.error;
    } catch (err: any) {
      if (err.message === 'TimeoutError') {
        throw new Error("L'envoi a pris trop de temps et a été annulé.");
      }
      throw err;
    }

    if (supabaseError) {
      console.error("Storage API Error:", supabaseError);
      throw new Error(supabaseError.message || "Erreur inconnue lors du transfert à Supabase.");
    }

    if (onProgress) onProgress('Finalisation...');
    
    // Génération de l'URL publique
    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(`${TENANT_ID}/${fileName}`);
    return publicUrlData.publicUrl;
  } catch (error: any) {
    console.error('Détail du crash Upload:', error);
    let errorMsg = 'Erreur inconnue lors du téléchargement';
    
    if (error.message?.includes('TimeoutError')) {
      errorMsg = "Le réseau est trop faible ou bloqué. L'envoi a été annulé après 15 secondes.";
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      errorMsg = "Erreur de connexion. Veuillez vérifier votre réseau.";
    } else if (error.message) {
      errorMsg = error.message; 
    }
    
    throw new Error(errorMsg);
  }
};

