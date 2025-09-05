import { promises as fs } from 'fs';
import path from 'path';
import type { StaticNFTData } from '@/lib/staticTypes';
import GalleryClient from './gallery-client';

// Enable ISR with 24-hour revalidation
export const revalidate = 86400; // 24 hours in seconds

async function getStaticData(): Promise<StaticNFTData> {
  // In production, this runs at build time and is cached
  // In development, it runs on each request
  const dataPath = path.join(process.cwd(), 'public', 'data', 'items.json');
  const jsonData = await fs.readFile(dataPath, 'utf-8');
  return JSON.parse(jsonData);
}

export default async function Home() {
  const staticData = await getStaticData();
  
  return <GalleryClient initialData={staticData} />;
}