import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import type { CardDetails } from '~backend/cards/get';

interface PreviewModalProps {
  card: CardDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PreviewModal({ card, isOpen, onClose }: PreviewModalProps) {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  if (!card) return null;

  const handleViewFull = () => {
    if (!isSignedIn) {
      navigate('/auth');
      return;
    }
    
    if (card.is_premium) {
      navigate(`/checkout?cardId=${card.id}`);
    } else {
      navigate(`/cards/${card.slug}`);
    }
    onClose();
  };

  const handleAffiliateClick = () => {
    // Track click for analytics
    if (card.affiliate_url) {
      // Open affiliate preview frame
      window.open(card.affiliate_url, '_blank');
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{card.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {card.images[0] && (
            <img
              src={card.images[0]}
              alt={card.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}
          
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{card.category}</Badge>
            {card.is_premium && (
              <Badge variant="default">${card.price}</Badge>
            )}
          </div>
          
          <p className="text-muted-foreground">{card.description}</p>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Preview</h4>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                {card.preview_content || "This is a preview of the content. Sign up to view the full details."}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {card.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          
          <div className="flex space-x-2 pt-4">
            <Button onClick={handleViewFull} className="flex-1">
              {card.is_premium ? 'Purchase & View Full' : 'View Full Details'}
            </Button>
            
            {card.affiliate_url && (
              <Button variant="outline" onClick={handleAffiliateClick}>
                Visit Tool
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
