from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UsernameOnlyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # Customize token payload if needed
        return super().get_token(user)

    def validate(self, attrs):
        username = attrs.get("username")

        if username is None:
            raise serializers.ValidationError("Username is required.")

        # Validate username here if needed

        return {"username": username}

class UsernameSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=50)
    #should i do data cleaning? oh well