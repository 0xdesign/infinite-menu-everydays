'use client';

import { ExternalLink } from 'lucide-react';

interface MetadataPanelProps {
  selectedItem: {
    id: string;
    title: string;
    description?: string;
    category?: string[];
    primary_category?: string;
    mint_url?: string;
    collection_address?: string;
    token_id?: string;
    network?: string;
    created_at?: string;
  } | null;
}

export default function MetadataPanel({ selectedItem }: MetadataPanelProps) {
  if (!selectedItem) {
    return (
      <aside className="fixed right-0 top-16 bottom-0 w-80 bg-black border-l border-white/10 z-40">
        <div className="p-6 text-white/40 font-mono text-xs uppercase tracking-[0.08em]">
          Select an item to view details
        </div>
      </aside>
    );
  }

  // Format mint date with robust parsing
  let date = 'DATE UNKNOWN';
  if (selectedItem.created_at && selectedItem.created_at !== '') {
    try {
      const parsedDate = new Date(selectedItem.created_at);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }).toUpperCase();
      }
    } catch {
      console.warn('Invalid date format:', selectedItem.created_at);
    }
  }

  // Format hash for display
  const formatHash = (address?: string) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Construct block explorer URL
  const getBlockExplorerUrl = (address?: string, network?: string) => {
    if (!address) return '#';
    
    const baseUrl = network?.toLowerCase().includes('mainnet') 
      ? 'https://etherscan.io/address/'
      : 'https://goerli.etherscan.io/address/';
    
    return baseUrl + address;
  };

  return (
    <aside className="fixed right-0 top-16 bottom-0 w-80 bg-black border-l border-white/10 z-40 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Title and Date */}
        <div>
          <h2 className="font-mono text-white uppercase text-sm tracking-[0.08em] mb-1">
            {selectedItem.title || 'ITEM TITLE'}
          </h2>
          <p className="font-mono text-white/60 text-xs uppercase tracking-[0.08em]">
            {date}
          </p>
        </div>

        {/* Category Tags */}
        {selectedItem.category && selectedItem.category.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedItem.category.slice(0, 3).map((cat) => (
              <span 
                key={cat}
                className="px-3 py-1 bg-white/10 rounded-full font-mono text-xs uppercase text-white/80 tracking-[0.08em]"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {selectedItem.description && (
          <div>
            <p className="font-mono text-white/80 text-xs leading-relaxed">
              {selectedItem.description}
            </p>
          </div>
        )}

        {/* Network and Hash */}
        <div className="space-y-3 pt-3 border-t border-white/10">
          {/* Network */}
          {selectedItem.network && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-white/60 text-xs uppercase">
                {selectedItem.network}
              </span>
            </div>
          )}

          {/* Collection Hash */}
          {selectedItem.collection_address && (
            <a
              href={getBlockExplorerUrl(selectedItem.collection_address, selectedItem.network)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group"
            >
              <span className="font-mono text-white/60 text-xs">
                #
              </span>
              <span className="font-mono text-white/60 group-hover:text-white text-xs transition-colors">
                {formatHash(selectedItem.collection_address)}
              </span>
              <ExternalLink size={12} className="text-white/40 group-hover:text-white/60 transition-colors" />
            </a>
          )}
        </div>

        {/* View Original Button */}
        {selectedItem.mint_url && (
          <div className="pt-4">
            <a
              href={selectedItem.mint_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 bg-white text-black font-mono uppercase text-xs tracking-[0.08em] text-center hover:bg-white/90 transition-colors"
            >
              VIEW ORIGINAL
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}