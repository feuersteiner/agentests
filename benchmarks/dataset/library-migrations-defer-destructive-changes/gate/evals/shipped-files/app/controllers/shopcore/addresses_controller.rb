module Shopcore
  class AddressesController < ::ApplicationController
    def index
      @addresses = current_addresses.active.order(:name)
    end

    def create
      @address = current_addresses.new(address_params)
      if @address.save
        redirect_to addresses_path
      else
        render :new, status: :unprocessable_entity
      end
    end

    def destroy
      current_addresses.find(params[:id]).destroy
      redirect_to addresses_path
    end

    private

    def current_addresses
      UserAddress.where(user_id: current_user.id)
    end

    def address_params
      params.require(:address).permit(:name, :line1, :line2, :city, :postcode, :country)
    end
  end
end
