/**
 * Script para crear categorías de ejemplo
 * Old Texas BBQ - CRM
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const categorias = [
  {
    nombre: 'Carnes BBQ',
    descripcion: 'Carnes ahumadas estilo texano',
    color: '#ef4444',
    orden: 0,
    activa: true,
  },
  {
    nombre: 'Guarniciones',
    descripcion: 'Complementos perfectos para tu BBQ',
    color: '#84cc16',
    orden: 1,
    activa: true,
  },
  {
    nombre: 'Bebidas',
    descripcion: 'Bebidas frías y refrescantes',
    color: '#06b6d4',
    orden: 2,
    activa: true,
  },
  {
    nombre: 'Postres',
    descripcion: 'Dulces tentaciones',
    color: '#ec4899',
    orden: 3,
    activa: true,
  },
  {
    nombre: 'Salsas',
    descripcion: 'Salsas artesanales de la casa',
    color: '#f97316',
    orden: 4,
    activa: true,
  },
  {
    nombre: 'Paquetes',
    descripcion: 'Paquetes familiares y combos',
    color: '#8b5cf6',
    orden: 5,
    activa: true,
  },
];

async function seedCategorias() {
  try {
    console.log('🔍 Verificando categorías existentes...');

    // Verificar si ya existen categorías
    const categoriasRef = collection(db, 'categorias');
    const snapshot = await getDocs(categoriasRef);

    if (snapshot.size > 0) {
      console.log(`✅ Ya existen ${snapshot.size} categorías en la base de datos.`);
      console.log('   No se crearon nuevas categorías.');
      return;
    }

    console.log('📝 No hay categorías. Creando categorías de ejemplo...\n');

    // Crear categorías
    for (const categoria of categorias) {
      const docRef = await addDoc(categoriasRef, {
        ...categoria,
        fechaCreacion: Timestamp.now(),
        fechaActualizacion: Timestamp.now(),
      });

      console.log(`✅ Creada: ${categoria.nombre} (ID: ${docRef.id})`);
    }

    console.log('\n🎉 ¡Categorías de ejemplo creadas exitosamente!');
    console.log(`   Total: ${categorias.length} categorías`);
    console.log('\n💡 Ahora puedes crear productos usando estas categorías.');
  } catch (error) {
    console.error('❌ Error al crear categorías:', error);
    throw error;
  }
}

// Ejecutar
seedCategorias()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el script:', error);
    process.exit(1);
  });
