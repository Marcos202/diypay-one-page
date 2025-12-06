import * as React from 'react';
import { motion, Variants } from 'framer-motion';
import { ChevronRight, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  isSeparator?: boolean;
  className?: string;
}

interface UserProfile {
  name: string;
  email: string;
  initial: string;
  avatarUrl?: string | null;
}

interface UserProfileMenuProps {
  user: UserProfile;
  navItems: NavItem[];
  onLogout: () => void;
  triggerVariant?: 'default' | 'glass';
  className?: string;
}

const menuVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 120,
      damping: 17,
    },
  },
};

export function UserProfileMenu({
  user,
  navItems,
  onLogout,
  triggerVariant = 'default',
  className,
}: UserProfileMenuProps) {
  const [open, setOpen] = React.useState(false);

  const handleItemClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center p-1 rounded-full transition-colors',
            triggerVariant === 'glass'
              ? 'hover:bg-white/10'
              : 'hover:bg-accent/50',
            className
          )}
        >
          <Avatar className="w-9 h-9">
            {user.avatarUrl && (
              <AvatarImage src={user.avatarUrl} alt={user.name} className="object-cover" />
            )}
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {user.initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 overflow-hidden shadow-lg rounded-xl border-border/50 bg-popover"
        sideOffset={8}
      >
        <motion.div
          initial="hidden"
          animate={open ? "visible" : "hidden"}
          variants={menuVariants}
          className="flex flex-col"
        >
              {/* User Info Header */}
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-4 p-5 border-b border-border"
              >
                <Avatar className="w-12 h-12">
                  {user.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt={user.name} className="object-cover" />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {user.initial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-base text-foreground truncate">
                    {user.name}
                  </span>
                  <span className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </span>
                </div>
              </motion.div>

              {/* Navigation Links */}
              <nav className="flex flex-col py-3">
                {navItems.map((item, index) => (
                  <React.Fragment key={index}>
                    {item.isSeparator && (
                      <motion.div
                        variants={itemVariants}
                        className="h-px bg-border my-2 mx-4"
                      />
                    )}
                    {item.href ? (
                      <motion.a
                        href={item.href}
                        variants={itemVariants}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'group flex items-center gap-4 px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                          item.className
                        )}
                      >
                        <span className="h-5 w-5 flex-shrink-0">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </motion.a>
                    ) : (
                      <motion.button
                        variants={itemVariants}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          'group flex items-center gap-4 px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground w-full text-left',
                          item.className
                        )}
                      >
                        <span className="h-5 w-5 flex-shrink-0">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </motion.button>
                    )}
                  </React.Fragment>
                ))}
              </nav>

              {/* Logout Button */}
              <motion.div variants={itemVariants} className="border-t border-border py-3">
                <button
                  onClick={() => {
                    onLogout();
                    setOpen(false);
                  }}
                  className="group flex w-full items-center gap-4 px-5 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </button>
              </motion.div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
