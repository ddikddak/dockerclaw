'use client';

import { useState } from 'react';
import { 
  BellIcon,
} from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Notifications() {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="py-8 text-center">
          <BellIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500">Notifications coming soon</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}