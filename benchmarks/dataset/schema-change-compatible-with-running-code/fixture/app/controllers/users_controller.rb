class UsersController < ApplicationController
  before_action :set_user

  def show
  end

  def update
    if @user.update(user_params)
      redirect_to user_path(@user), notice: "Profile updated."
    else
      render :show, status: :unprocessable_entity
    end
  end

  private

  def set_user
    @user = current_user
    head :not_found unless @user.login == params[:login]
  end

  def user_params
    params.require(:user).permit(:login, :name, :email)
  end
end
