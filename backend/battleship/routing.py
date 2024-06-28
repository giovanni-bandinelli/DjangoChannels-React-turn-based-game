from django.urls import re_path
from battleship.consumers import BattleshipConsumer  # Correct import path to consumers

websocket_urlpatterns = [
    re_path(r'ws/lobby/(?P<room_id>\w+)/$', BattleshipConsumer.as_asgi()),
]
