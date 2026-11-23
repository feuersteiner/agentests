# plover-web

Password reset and invitation emails link back to the app. In a request, `url_for(..., _external=True)`
gives an absolute URL on `request.host_url`.
