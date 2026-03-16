
import { useBlockedDatesFetching } from './reservation/useBlockedDatesFetching';
import { useBlockedDatesUtils } from './reservation/useBlockedDatesUtils';

export const useBlockedDates = (isTimeSlotAvailable: (date: Date, startTime: string, endTime: string) => boolean) => {
  const { blockedDates, isLoading, fetchBlockedDates } = useBlockedDatesFetching();
  const { isDateBlocked, disabledDays } = useBlockedDatesUtils(blockedDates, isTimeSlotAvailable);

  return {
    blockedDates,
    isLoading,
    isDateBlocked,
    disabledDays,
    fetchBlockedDates
  };
};
