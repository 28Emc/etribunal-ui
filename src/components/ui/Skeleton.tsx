import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@utils/helpers';

export interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-border-main/20 via-border-main/10 to-border-main/20 bg-[length:200%_100%]",
        className
      )}
    />
  );
};

export function CaseCardSkeleton() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-full bg-card rounded-[32px] overflow-hidden border border-border-main/5 mb-2 md:mb-3 flex flex-col box-border">
      <div className="p-3 md:p-4 pb-2">
        <div className="flex flex-wrap gap-2 mb-3 items-center justify-between">
          <div className="flex gap-2 items-center">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-14 rounded" />
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <Skeleton className="h-3 w-24 rounded" />
          <div className="flex-1 flex justify-center">
            <Skeleton className="w-16 h-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        </div>
        <Skeleton className="h-5 w-3/4 rounded mb-1" />
        <Skeleton className="h-4 w-full rounded mb-1" />
        <Skeleton className="h-4 w-2/3 rounded mb-3" />
        <div className="mt-3 rounded-2xl bg-card/50 border border-border-main/10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
          <Skeleton className="w-7 h-7 rounded-full" />
        </div>
      </div>
      <div className="border-y border-border-main/10 overflow-hidden h-[200px] md:h-[280px] lg:h-[320px] grid grid-cols-2">
        <Skeleton className="h-full rounded-none" />
        <Skeleton className="h-full rounded-none" />
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-full" />
            <Skeleton className="w-14 h-9 rounded-2xl" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-2xl" />
            <Skeleton className="w-9 h-9 rounded-2xl" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function UserCardSkeleton() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="p-4 bg-card border border-border-main/5 rounded-2xl flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      <Skeleton className="h-8 w-16 rounded-full" />
    </motion.div>
  );
}

export function FeedSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-4">
      {[1, 2, 3].map((i) => (
        <CaseCardSkeleton key={i} />
      ))}
    </motion.div>
  );
}

export function CaseDetailSkeleton() {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex-1 px-2 md:px-4 py-6 space-y-10 pb-10 bg-card/50 m-2 md:m-8 rounded-[32px] border border-border-main/5">
      <div className="space-y-4 text-center">
        <div className="flex justify-center flex-wrap gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-9 w-3/4 mx-auto rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-16">
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 md:gap-4">
            <Skeleton className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
          <Skeleton className="h-32 w-full rounded-[32px]" />
          <div className="flex gap-2">
            <Skeleton className="h-24 w-24 rounded-2xl" />
            <Skeleton className="h-24 w-24 rounded-2xl" />
            <Skeleton className="h-24 w-24 rounded-2xl" />
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-end gap-3 md:gap-4">
            <div className="space-y-2 text-right">
              <Skeleton className="h-5 w-24 ml-auto rounded" />
              <Skeleton className="h-3 w-16 ml-auto rounded" />
            </div>
            <Skeleton className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full" />
          </div>
          <Skeleton className="h-32 w-full rounded-[32px]" />
          <div className="flex gap-2 justify-end">
            <Skeleton className="h-24 w-24 rounded-2xl" />
            <Skeleton className="h-24 w-24 rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="space-y-3 max-w-2xl mx-auto">
        <Skeleton className="h-4 w-48 mx-auto rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto pt-4">
        <Skeleton className="h-6 w-32 rounded" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-3/4 ml-auto rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </motion.div>
  );
}

export function TrendingCaseSkeleton() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="p-4 bg-card border border-border-main/5 rounded-[24px] space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3 w-8 rounded" />
      </div>
      <Skeleton className="h-5 w-full rounded" />
      <Skeleton className="h-4 w-2/3 rounded" />
      <div className="flex gap-3">
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="h-3 w-12 rounded" />
      </div>
    </motion.div>
  );
}
