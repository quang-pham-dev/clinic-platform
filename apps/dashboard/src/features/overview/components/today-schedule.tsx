import { ROUTES } from '../../../constants';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@clinic-platform/ui';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowUpRight, Stethoscope } from 'lucide-react';
import * as React from 'react';

interface TodayScheduleProps {
  isLoading: boolean;
  skeletonRows: number[];
}

export function TodaySchedule({ isLoading, skeletonRows }: TodayScheduleProps) {
  return (
    <Card className="bg-gray-900/80 border-gray-800 flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-white">
          Today&apos;s Schedule
        </CardTitle>
        <Button
          variant="link"
          className="text-teal-400 hover:text-teal-300 p-0 h-auto"
          asChild
        >
          <Link to={ROUTES.DOCTORS}>
            View all <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 flex-1">
        {isLoading ? (
          skeletonRows.map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/30 animate-pulse"
            >
              <div className="w-2 h-8 bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-700 rounded w-2/5" />
                <div className="h-2.5 bg-gray-700/50 rounded w-1/4" />
              </div>
              <div className="h-3 w-12 bg-gray-700 rounded" />
            </div>
          ))
        ) : (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Stethoscope className="w-12 h-12 text-gray-700 mb-3" />
            <p className="text-gray-400">
              Select a specific doctor to view their schedule.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                className="mt-4 border-gray-700 bg-gray-800 text-white hover:bg-gray-700 hover:text-white"
                asChild
              >
                <Link to={ROUTES.DOCTORS}>Go to Directory</Link>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
