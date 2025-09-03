import os
import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

# Import the job functions and bootstrap from the API module
from main import run_ndc_import_job, run_label_enrich_job, bootstrap_data

logger = logging.getLogger("medical_scheduler")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def main():
    # Guard: run only when explicitly enabled
    if os.getenv("ENABLE_SCHEDULER", "0").lower() not in ("1", "true", "yes"): 
        logger.info("scheduler_disabled set ENABLE_SCHEDULER=1 to enable")
        return

    # Ensure DB migrations/backfills are applied before scheduling
    try:
        bootstrap_data()
    except Exception as e:
        logger.error(f"bootstrap_failed error={e}")

    ndc_cron = os.getenv("SCHEDULE_OPENFDA_NDC_CRON", "0 2 * * *")
    label_cron = os.getenv("SCHEDULE_OPENFDA_LABEL_CRON", "30 2 * * *")

    scheduler = BlockingScheduler(timezone="UTC")

    try:
        scheduler.add_job(run_ndc_import_job, CronTrigger.from_crontab(ndc_cron), id="ndc_import", replace_existing=True)
        scheduler.add_job(run_label_enrich_job, CronTrigger.from_crontab(label_cron), id="label_enrich", replace_existing=True)
        logger.info(f"scheduler_started ndc_cron='{ndc_cron}' label_cron='{label_cron}' timezone='UTC'")
        scheduler.start()
    except KeyboardInterrupt:
        logger.info("scheduler_stopping due_to=keyboard_interrupt")
    except Exception as e:
        logger.error(f"scheduler_error error={e}")
        raise


if __name__ == "__main__":
    main()