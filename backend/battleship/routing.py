from django.urls import path
from battleship.consumers import BattleshipConsumer  # Correct import path to consumers

websocket_urlpatterns = [
#    re_path(r'^ws/lobby/(?P<room_id>\w+)/$', BattleshipConsumer.as_asgi()),
    path('ws/lobby/<str:room_id>/<str:token>/', BattleshipConsumer.as_asgi()),

]
