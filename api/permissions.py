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
        if user.is_specialist:
            return bool(
                user.category_specialization_id
                and user.category_specialization_id == obj.category_id
            )
        return obj.resident_id == user.id


class IsAdminRole(permissions.BasePermission):
    """Only Admins may update complaint status/assignment."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )


class IsStaffOperator(permissions.BasePermission):
    """Admins and category specialists can operate on their own queue."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff_operator
        )

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_admin:
            return True
        return bool(
            user.is_specialist
            and user.category_specialization_id
            and user.category_specialization_id == obj.category_id
        )
