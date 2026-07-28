from rest_framework import permissions


class IsResident(permissions.BasePermission):
    """Only Residents may create complaints."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "RESIDENT"
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Residents can only view/edit their own complaint.
    Admins (role=ADMIN or is_superuser) can view/edit any complaint.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_admin:
            return True
        return obj.resident_id == user.id


class IsAdminRole(permissions.BasePermission):
    """Only Admins may update complaint status/assignment."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )