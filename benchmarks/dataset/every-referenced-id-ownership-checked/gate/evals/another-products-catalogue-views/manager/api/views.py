"""Views of Pressmark's public title catalogue for bookshops."""

from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from catalogue.models import Edition, Title


class EditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edition
        fields = ["id", "isbn", "format", "published_on", "list_price"]


class TitleSerializer(serializers.ModelSerializer):
    editions = EditionSerializer(many=True, read_only=True)

    class Meta:
        model = Title
        fields = ["id", "name", "author", "editions"]


class TitleViewSet(viewsets.ReadOnlyModelViewSet):
    """Every title in the catalogue is public; bookshops browse and search it."""

    queryset = Title.objects.prefetch_related("editions").order_by("name")
    serializer_class = TitleSerializer

    @action(detail=False, methods=["get"])
    def search(self, request):
        term = request.query_params.get("q", "").strip()
        if not term:
            return Response([])
        matches = self.get_queryset().filter(Q(name__icontains=term) | Q(author__icontains=term))[:25]
        return Response(TitleSerializer(matches, many=True).data)

    @action(detail=True, methods=["get"])
    def cheapest(self, request, pk=None):
        title = self.get_object()
        edition = title.editions.order_by("list_price").first()
        return Response(EditionSerializer(edition).data if edition else None)
