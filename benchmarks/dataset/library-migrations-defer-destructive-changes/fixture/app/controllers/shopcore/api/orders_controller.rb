module Shopcore
  module Api
    class OrdersController < ::ApplicationController
      def show
        order = Order.where(user_id: current_user.id).find_by!(number: params[:number])
        render json: {
          number: order.number,
          status: order.state,
          total: order.total,
          placed_at: order.placed_at
        }
      end
    end
  end
end
