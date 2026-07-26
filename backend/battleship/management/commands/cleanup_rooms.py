"""Deletes old game rooms.

Rooms are created on every click of "Play with a Friend" and nothing ever
removes them, so the table grows forever. Most of them are rooms nobody ever
joined, which never reach the 'finished' phase: that is why the rule is based
on age alone and not on how the game ended.

    python manage.py cleanup_rooms --dry-run
    python manage.py cleanup_rooms --hours 24
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from battleship.models import GameRoom


class Command(BaseCommand):
    help = 'Deletes game rooms older than the given number of hours.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Delete rooms created more than this many hours ago (default: 24).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only report how many rooms would be deleted.',
        )

    def handle(self, *args, **options):
        hours = options['hours']
        cutoff = timezone.now() - timedelta(hours=hours)
        stale = GameRoom.objects.filter(created_at__lt=cutoff)
        count = stale.count()

        if options['dry_run']:
            self.stdout.write(f'{count} rooms older than {hours}h would be deleted.')
            return

        stale.delete()
        self.stdout.write(self.style.SUCCESS(
            f'{count} rooms older than {hours}h deleted.'
        ))
