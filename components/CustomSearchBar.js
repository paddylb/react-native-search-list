/**
 * Created by haywoodfu on 17/4/16.
 */

'use strict'
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableWithoutFeedback,
  Animated
} from 'react-native'

import React, { Component } from 'react'

import PropTypes from 'prop-types'

const buttonWidth = 70

export default class CustomSearchBar extends Component {

  constructor (props) {
    super(props)
    this.state = {
      value: props.value,
      isShowHolder: true,
      animatedValue: new Animated.Value(0),
      hideCancel:true,
    }
  }

  onChange (str) {
    if (this.props.onChange) {
      this.props.onChange(str)
    }
    this.setState({str})
  }

  onBlur () {
    if (this.props.onBlur) {
      this.props.onBlur()
    }
  }

  onFocus () {
    if (this.props.onFocus) {
      this.props.onFocus()
    }
    this.searchingAnimation(true)
  }

  searchingAnimation (isSearching) {
    let toVal = 0

    if (isSearching) {
      this.setState({hideCancel: false})
      this.state.animatedValue.setValue(0)
      toVal = buttonWidth
    } else {
      this.setState({hideCancel: true})
      this.state.animatedValue.setValue(buttonWidth)
      toVal = 0
    }
    
    Animated.timing(this.state.animatedValue, {
      duration: 300,
      toValue: toVal
    }).start(() => {
      this.setState({isShowHolder: !isSearching})
    })
  }

  cancelSearch () {
    this.refs.input.clear()
    this.refs.input.blur()
    this.searchingAnimation(false)
    this.props.onClickCancel && this.props.onClickCancel()
  }

  render () {
    return (
      <TouchableWithoutFeedback onPress={() => this.refs.input.focus()}>
        <View
          style={[this.props.style, {flexDirection: 'row', padding: 8, height: 44, backgroundColor: '#171a23'}]}>
          <Image
            style={{
              position: 'absolute',
              width: 12,
              height: 12,
              top: 16,
              left: 18,
              zIndex: 2,
              opacity: !this.state.isShowHolder ? 1 : 0
            }}
            source={require('../images/icon-search.png')} />

          <Animated.View style={{
            width: this.state.inputLength,
            backgroundColor: this.state.animatedValue.interpolate({
              inputRange: [0, 70],
              outputRange: ['#2f3139', this.props.activeSearchBarColor]
            }),
            height: 28,
            borderRadius: 5,
            flex: 1,
          }}>
            <TextInput
              onFocus={this.onFocus.bind(this)}
              onBlur={this.onBlur.bind(this)}
              ref='input'
              style={[{
                flex: 1,
                color: this.props.searchBarActiveColor && !this.state.isShowHolder ? this.props.searchBarActiveColor : '#979797',
                height: 28,
                padding: 0,
                paddingLeft: 30,
                paddingRight: 8,
                borderRadius: 5,
              }, this.props.customSearchBarStyle]}
              onChangeText={this.onChange.bind(this)}
              value={this.state.value}
              underlineColorAndroid='transparent'
              returnKeyType='search' />
          </Animated.View>
          <Animated.View style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 44,
            position: 'absolute',
            justifyContent: 'center',
            left: 0,
            right: 0,
            opacity: this.state.animatedValue.interpolate({
              inputRange: [0, 70],
              outputRange: [!this.state.value ? 1 : 0, 0]
            })
          }}>
            <Image style={{width: 12, height: 12, marginRight: 5}}
              source={require('../images/icon-search.png')} />
            <Text style={{
              color: '#979797',
              fontSize: 14,
              backgroundColor: 'rgba(0, 0, 0, 0)'
            }}>{this.props.placeholder}</Text>
          </Animated.View>
          <Animated.View style={{
            backgroundColor: '#171a23',
            width: this.state.animatedValue
          }}>
            <TouchableWithoutFeedback onPress={this.cancelSearch.bind(this)}>
              <View
                style={{
                  flex: 1,
                  height: 30,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 10,
                  paddingLeft: 5,
                  paddingRight: 5,
                  borderRadius: 5
                }}
                shouldRasterizeIOS
                renderToHardwareTextureAndroid
              >
                <Text style={{color: this.props.textColor ? this.props.textColor : 'white'}} numberOfLines={1}>{this.state.hideCancel ? '' : 'Cancel'}</Text>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    )
  };
}

CustomSearchBar.propTypes = {
  showActiveSearchIcon: PropTypes.bool,
  isShowHolder: PropTypes.bool // 是否显示搜索图标
}
